import supabase from "../config/db.js";
import { getOrSet, invalidatePattern } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { createNotification } from "./notification.controller.js";

export async function createCommunity(req, res, next) {
  try {
    const { name, description, banner_url, privacy, category } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // 1. Check if user is a creator
    // we do this check when user login or signup but for now we do this check here
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      const err = new Error("Failed to verify user role");
      err.code = "AUTH_ERROR";
      throw err;
    }

    if (userData.role !== "creator") {
      return res.status(403).json({
        success: false,
        error: "Only creators can create communities",
      });
    }

    // 2. Check if creator already has a community
    const { data: existingCommunity, error: existingError } = await supabase
      .from("communities")
      .select("id")
      .eq("creator_id", userId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingCommunity) {
      return res.status(400).json({
        success: false,
        error: "You can only create one community",
      });
    }

    // 3. Create the community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .insert({
        name,
        description,
        banner_url,
        privacy: privacy || "public",
        category: category || "General",
        creator_id: userId,
        members_count: 1, // Start with the creator
      })
      .select()
      .single();

    if (communityError) {
      throw communityError;
    }

    // 4. Automatically join the creator as an admin
    const { error: memberError } = await supabase
      .from("community_members")
      .insert({
        community_id: community.id,
        user_id: userId,
        role: "admin",
      });
    if (memberError) {
      logger.error("Error joining creator to community:", memberError);
      // Rollback: delete the community
      await supabase.from("communities").delete().eq("id", community.id);
      throw new Error("Failed to initialize community membership");
    }

    return res.status(201).json({ success: true, data: community });
  } catch (error) {
    next(error);
  }
}

export async function getDiscoverCommunities(req, res, next) {
  try {
    const userId = req.user?.id;
    const { category, search } = req.query;

    // Show both public and private communities in discover
    let query = supabase
      .from("communities")
      .select("*, creator:users!communities_creator_id_fkey(id, username)");

    const isValidCategory =
      category &&
      category !== "All" &&
      category !== "null" &&
      category !== "undefined";
    if (isValidCategory) {
      query = query.eq("category", category);
    }

    if (search && search.trim() !== "") {
      // Escape special PostgREST filter characters
      const sanitizedSearch = search.trim().replace(/[%_.*,()]/g, "");
      query = query.or(
        `name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`,
      );
    }

    const { data, error } = await query
      .order("members_count", { ascending: false })
      .limit(20);

    if (error) {
      logger.error("Discover Communities Error:", error);
      throw error;
    }

    // Add is_joined flag and join_request_status to each community
    if (userId && data) {
      const { data: joined } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);

      const { data: joinRequests } = await supabase
        .from("community_join_requests")
        .select("community_id, status")
        .eq("user_id", userId)
        .in("status", ["pending"]);

      const joinedIds = new Set(joined?.map((j) => j.community_id) || []);
      const requestMap = new Map(
        (joinRequests || []).map((r) => [r.community_id, r.status]),
      );

      data.forEach((community) => {
        community.is_joined = joinedIds.has(community.id);
        community.join_request_status = requestMap.get(community.id) || null;
      });
    } else if (data) {
      data.forEach((community) => {
        community.is_joined = false;
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getJoinedCommunities(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("community_members")
      .select(
        "role, joined_at, community:communities(*, creator:users!communities_creator_id_fkey(id, username))",
      )
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function joinCommunity(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Check if community is private — block direct join
    const { data: communityCheck } = await supabase
      .from("communities")
      .select("privacy")
      .eq("id", id)
      .single();

    if (communityCheck?.privacy === "private") {
      return res.status(403).json({
        success: false,
        error: "This community is private. Send a join request instead.",
      });
    }

    // Use atomic RPC function to handle insert + increment in a transaction
    const { data, error } = await supabase.rpc("join_community_atomic", {
      p_community_id: id,
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    // Check the result from the atomic function
    if (data && !data.success) {
      if (data.error === "already_member") {
        return res.status(409).json({ success: false, error: data.message });
      }
      return res.status(400).json({ success: false, error: data.message });
    }

    // Notify the community creator that someone joined
    try {
      const { data: community } = await supabase
        .from("communities")
        .select("creator_id, name")
        .eq("id", id)
        .single();

      const { data: joiner } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .single();

      if (community?.creator_id) {
        await createNotification({
          userId: community.creator_id,
          actorId: userId,
          type: "community_join",
          title: `${joiner?.username || "Someone"} joined ${community.name}`,
          data: { community_id: id },
        });
      }
    } catch (notifErr) {
      logger.error("Community join notification error:", notifErr);
      // Non-fatal — join was successful
    }

    return res.status(200).json({ success: true, message: "Joined community" });
  } catch (error) {
    next(error);
  }
}

export async function leaveCommunity(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Prevent creator from leaving their own community
    const { data: community } = await supabase
      .from("communities")
      .select("creator_id")
      .eq("id", id)
      .single();
    if (community?.creator_id === userId) {
      return res.status(400).json({
        success: false,
        error:
          "Community creator cannot leave. Transfer ownership or delete the community.",
      });
    }

    // Use atomic RPC function to handle delete + decrement in a transaction
    const { data, error } = await supabase.rpc("leave_community_atomic", {
      p_community_id: id,
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    // Check the result from the atomic function
    if (data && !data.success) {
      if (data.error === "not_member") {
        return res.status(404).json({ success: false, error: data.message });
      }
      return res.status(400).json({ success: false, error: data.message });
    }

    return res.status(200).json({ success: true, message: "Left community" });
  } catch (error) {
    next(error);
  }
}

export async function getCommunityById(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("communities")
      .select("*, creator:users!communities_creator_id_fkey(id, username)")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// POSTS

export async function createPost(req, res, next) {
  try {
    const { content, images, community_id } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const imagesArray = images
      ? Array.isArray(images)
        ? images
        : [images]
      : [];

    const { data, error } = await supabase
      .from("posts")
      .insert({
        content,
        images: imagesArray,
        user_id: userId,
        community_id: community_id || null,
      })
      .select(
        "*, user:users(id, username, email, profile_image_url, creators(bio))",
      )
      .single();

    if (data?.user) {
      data.user.bio = data.user.creators?.bio;
    }

    if (error) {
      logger.error("Supabase error creating post:", error);
      throw error;
    }

    // Invalidate feed cache
    await invalidatePattern("feed:*");

    return res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error("Exception creating post:", error);
    next(error);
  }
}

export async function getFeed(req, res, next) {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const communityId = req.query.community_id;

    const cacheKey = `feed:${communityId || "global"}:page:${page}:limit:${limit}`;

    const { posts, count } = await getOrSet(
      cacheKey,
      async () => {
        let query = supabase
          .from("posts")
          .select(
            "*, user:users(id, username, email, profile_image_url, followers_count, following_count, creators(bio, verification_status)), community:communities(*)",
            { count: "exact" },
          );

        if (communityId !== undefined && communityId !== null) {
          const isValidId =
            communityId !== "null" &&
            communityId !== "undefined" &&
            communityId !== "";
          if (isValidId) {
            query = query.eq("community_id", communityId);
          } else {
            // If community_id is provided but literally "null"/"undefined"/"",
            // we should probably NOT fallback to global.
            // Let's filter for posts with NO community_id (global posts) or return empty.
            // For now, let's say these specific strings mean "global posts"
            query = query.is("community_id", null);
          }
        }

        const {
          data: posts,
          error,
          count,
        } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          throw error;
        }

        return { posts, count };
      },
      30, // 30 seconds TTL
    );

    if (userId && posts) {
      // 1. Check likes
      const { data: userLikes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", userId);

      const likedPostIds = new Set(userLikes?.map((l) => l.post_id) || []);

      // 2. Check follow status
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      const followingIds = new Set(following?.map((f) => f.following_id) || []);

      posts.forEach((post) => {
        post.has_liked = likedPostIds.has(post.id);
        post.is_following = followingIds.has(post.user_id);
        if (post.user) {
          post.user.bio = post.user.creators?.bio;
          post.user.verification_status =
            post.user.creators?.verification_status;
        }
      });
    } else if (posts) {
      posts.forEach((post) => {
        if (post.user) {
          post.user.bio = post.user.creators?.bio;
          post.user.verification_status =
            post.user.creators?.verification_status;
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total: count,
        page,
        limit,
        hasMore: count > to + 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPostById(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("posts")
      .select(
        "*, user:users(id, username, email, profile_image_url, creators(bio))",
      )
      .eq("id", id)
      .single();

    if (data?.user) {
      data.user.bio = data.user.creators?.bio;
    }

    if (error) {
      throw error;
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updatePost(req, res, next) {
  try {
    const { id } = req.params;
    const { content, images } = req.body;
    const userId = req.user?.id;

    // Check ownership
    const { data: existingPost } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (existingPost?.user_id !== userId) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to edit this post" });
    }

    const { data, error } = await supabase
      .from("posts")
      .update({ content, images })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate feed cache
    await invalidatePattern("feed:*");

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function deletePost(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check ownership
    const { data: existingPost } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (existingPost?.user_id !== userId) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to delete this post" });
    }

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      throw error;
    }

    // Invalidate feed cache
    await invalidatePattern("feed:*");

    return res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error) {
    next(error);
  }
}

// ============ LIKES ============

export async function likePost(req, res, next) {
  const { id: post_id } = req.params;
  const user_id = req.user?.id;
  logger.debug(`[likePost] Post: ${post_id}, User: ${user_id}`);

  try {
    if (!user_id)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    // UUID Validation (Defensive)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(post_id)) {
      logger.error(`Invalid UUID format for post_id: ${post_id}`);
      return res
        .status(400)
        .json({ success: false, error: "Invalid post ID format" });
    }

    // ... (rest of the logic remains the same, just checking for throws) ...
    // 1. Attempt Atomic RPC
    logger.debug("Attempting handle_post_like RPC...");
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "handle_post_like",
      {
        p_post_id: post_id,
        p_user_id: user_id,
        p_action: "like",
      },
    );

    if (!rpcError) {
      logger.debug("RPC Success");
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      // Notify the post owner about the like
      try {
        const { data: post } = await supabase
          .from("posts")
          .select("user_id")
          .eq("id", post_id)
          .single();

        const { data: liker } = await supabase
          .from("users")
          .select("username")
          .eq("id", user_id)
          .single();

        if (post?.user_id && post.user_id !== user_id) {
          await createNotification({
            userId: post.user_id,
            actorId: user_id,
            type: "like",
            title: `${liker?.username || "Someone"} liked your post`,
            data: { post_id },
          });
        }
      } catch (notifErr) {
        logger.error("Like notification error:", notifErr);
      }

      return res.status(200).json({
        success: true,
        message: "Post liked (atomic)",
        likes_count: result?.new_likes_count ?? 0,
        has_liked: result?.new_has_liked ?? true,
      });
    }

    logger.debug(`RPC Failed with code: ${rpcError.code}`);

    // 2. Fallback Path
    if (rpcError.code === "PGRST202") {
      logger.debug("RPC not found, running fallback...");

      const { data: existingLike, error: checkError } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", post_id)
        .eq("user_id", user_id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existingLike) {
        logger.debug("Inserting new like...");
        const { error: insertError } = await supabase
          .from("post_likes")
          .insert({ post_id, user_id });

        if (insertError) {
          if (insertError.code === "23505") {
            // Already liked - return current state without incrementing
            const { count: likesCount } = await supabase
              .from("post_likes")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post_id);
            return res.status(200).json({
              success: true,
              message: "Already liked",
              likes_count: likesCount || 0,
              has_liked: true,
            });
          }
          throw insertError;
        }

        logger.debug("Calling increment_likes fallback...");
        await supabase.rpc("increment_likes", { post_id });
      }

      logger.debug("Fetching final count...");
      const { count: likesCount, error: countError } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post_id);

      if (countError) throw countError;

      return res.status(200).json({
        success: true,
        message: "Post liked (fallback)",
        likes_count: likesCount || 0,
        has_liked: true,
      });
    }

    logger.error("Unexpected RPC Error:", rpcError);
    throw rpcError;
  } catch (error) {
    logger.error("Catch Block hit in likePost:", error);
    next(error);
  }
}

export async function unlikePost(req, res, next) {
  const { id: post_id } = req.params;
  const user_id = req.user?.id;
  logger.debug(`[unlikePost] Post: ${post_id}, User: ${user_id}`);

  try {
    if (!user_id)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(post_id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid post ID format" });
    }

    logger.debug("Attempting handle_post_like RPC for unlike...");
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "handle_post_like",
      {
        p_post_id: post_id,
        p_user_id: user_id,
        p_action: "unlike",
      },
    );

    if (!rpcError) {
      logger.debug("RPC Unlike Success");
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      return res.status(200).json({
        success: true,
        message: "Post unliked (atomic)",
        likes_count: result?.new_likes_count ?? 0,
        has_liked: result?.new_has_liked ?? false,
      });
    }

    logger.debug(`RPC Unlike Failed with code: ${rpcError.code}`);

    if (rpcError.code === "PGRST202") {
      logger.debug("RPC not found, running unlike fallback...");

      const { error: deleteError } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post_id)
        .eq("user_id", user_id);

      if (deleteError) throw deleteError;

      logger.debug("Calling decrement_likes fallback...");
      await supabase.rpc("decrement_likes", { post_id });

      const { count: likesCount, error: countError } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post_id);

      if (countError) throw countError;

      return res.status(200).json({
        success: true,
        message: "Post unliked (fallback)",
        likes_count: likesCount || 0,
        has_liked: false,
      });
    }

    logger.error("Unexpected RPC Unlike Error:", rpcError);
    throw rpcError;
  } catch (error) {
    logger.error("Catch Block hit in unlikePost:", error);
    next(error);
  }
}

// ============ COMMENTS ============

export async function addComment(req, res, next) {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Comment content is required" });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: id,
        user_id: userId,
        content: content.trim(),
        parent_id: parentId || null,
      })
      .select("*, user:users(id, username, email, creators(bio))")
      .single();

    if (data?.user) {
      data.user.bio = data.user.creators?.bio;
    }

    if (error) {
      throw error;
    }

    // Increment comments_count on post
    await supabase.rpc("increment_comments", { post_id: id });

    // If it's a reply, increment replies_count on the parent comment
    if (parentId) {
      await supabase.rpc("increment_comment_replies", {
        parent_row_id: parentId,
      });
    }

    // Invalidate comments cache for this post
    await invalidatePattern(`comments:post:${id}`);

    // Notify the post owner about the comment
    try {
      const { data: post } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", id)
        .single();

      const { data: commenter } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .single();

      if (post?.user_id && post.user_id !== userId) {
        await createNotification({
          userId: post.user_id,
          actorId: userId,
          type: "comment",
          title: `${commenter?.username || "Someone"} commented on your post`,
          body: content.trim().substring(0, 100),
          data: { post_id: id, comment_id: data.id },
        });
      }

      // If it's a reply, also notify the parent comment author
      if (parentId) {
        const { data: parentComment } = await supabase
          .from("comments")
          .select("user_id")
          .eq("id", parentId)
          .single();

        if (
          parentComment?.user_id &&
          parentComment.user_id !== userId &&
          parentComment.user_id !== post?.user_id
        ) {
          await createNotification({
            userId: parentComment.user_id,
            actorId: userId,
            type: "comment",
            title: `${commenter?.username || "Someone"} replied to your comment`,
            body: content.trim().substring(0, 100),
            data: {
              post_id: id,
              comment_id: data.id,
              parent_comment_id: parentId,
            },
          });
        }
      }
    } catch (notifErr) {
      logger.error("Comment notification error:", notifErr);
    }

    return res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getComments(req, res, next) {
  try {
    const { id: postId } = req.params;
    const userId = req.user?.id;
    const cacheKey = `comments:post:${postId}`;

    // 1. Fetch base comments and like mapping from cache/db
    const cachedData = await getOrSet(
      cacheKey,
      async () => {
        logger.debug(`[getComments] Cache miss for post: ${postId}`);

        // A. Fetch comments with user details
        const { data: comments, error } = await supabase
          .from("comments")
          .select(
            "*, user:users(id, username, email, profile_image_url, creators(bio))",
          )
          .eq("post_id", postId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (!comments || comments.length === 0)
          return { comments: [], likesMap: {} };

        // Flatten creator bio
        comments.forEach((c) => {
          if (c.user) {
            c.user.bio = c.user.creators?.bio;
          }
        });

        // B. Fetch all likes for these comments to build the map
        const commentIds = comments.map((c) => c.id);
        const { data: allLikes } = await supabase
          .from("comment_likes")
          .select("comment_id, user_id")
          .in("comment_id", commentIds);

        const likesMap = {};
        allLikes?.forEach((like) => {
          if (!likesMap[like.comment_id]) {
            likesMap[like.comment_id] = [];
          }
          likesMap[like.comment_id].push(like.user_id);
        });

        return { comments, likesMap };
      },
      300, // 5 minutes TTL
    );

    // 2. Perform session-specific formatting (dynamic)
    const { comments, likesMap } = cachedData;
    const formattedComments = comments.map((comment) => {
      const userIdsWhoLiked = likesMap[comment.id] || [];
      return {
        ...comment,
        likes_count: userIdsWhoLiked.length,
        has_liked: userId ? userIdsWhoLiked.includes(userId) : false,
      };
    });

    return res.status(200).json({ success: true, data: formattedComments });
  } catch (error) {
    logger.error("Error in getComments:", error);
    next(error);
  }
}

export async function deleteComment(req, res, next) {
  try {
    const { id, commentId } = req.params;
    const userId = req.user?.id;

    // Check ownership
    const { data: existingComment } = await supabase
      .from("comments")
      .select("user_id, post_id, parent_id")
      .eq("id", commentId)
      .single();

    if (existingComment?.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this comment",
      });
    }

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      throw error;
    }

    // Decrement comments_count
    await supabase.rpc("decrement_comments", { post_id: id });

    if (existingComment?.parent_id) {
      await supabase.rpc("decrement_comment_replies", {
        parent_row_id: existingComment.parent_id,
      });
    }

    return res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (error) {
    next(error);
  }
}

export async function likeComment(req, res, next) {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from("comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .single();

    if (existingLike) {
      return res
        .status(400)
        .json({ success: false, error: "Already liked this comment" });
    }

    const { error } = await supabase.from("comment_likes").insert({
      comment_id: commentId,
      user_id: userId,
    });

    if (error) {
      throw error;
    }

    // Increment likes_count
    await supabase.rpc("increment_comment_likes", {
      comment_row_id: commentId,
    });

    return res.status(200).json({ success: true, message: "Comment liked" });
  } catch (error) {
    next(error);
  }
}

export async function unlikeComment(req, res, next) {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    // Decrement likes_count
    await supabase.rpc("decrement_comment_likes", {
      comment_row_id: commentId,
    });

    return res.status(200).json({ success: true, message: "Comment unliked" });
  } catch (error) {
    next(error);
  }
}

export async function editComment(req, res, next) {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Content is required" });
    }

    const { data, error } = await supabase
      .from("comments")
      .update({ content: content.trim(), is_edited: true })
      .eq("id", commentId)
      .eq("user_id", userId) // Ensure ownership
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Comment not found or not authorized",
        });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Comment not found or not authorized",
      });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// export async function deleteComment(req, res) {
//   try {
//     const { commentId } = req.params;
//     const userId = req.user?.id;

//     if (!userId) {
//       return res.status(401).json({ success: false, error: "Unauthorized" });
//     }

//     const { error } = await supabase
//       .from("comments")
//       .delete()
//       .eq("id", commentId)
//       .eq("user_id", userId);

//     if (error) {
//       return res.status(500).json({ success: false, error: error.message });
//     }

//     return res.status(200).json({ success: true, message: "Comment deleted" });
//   } catch (error) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// }

// export async function updateComment(req, res) {
//   try {
//     const { commentId } = req.params;
//     const { content } = req.body;
//     const userId = req.user?.id;

//     if (!userId) {
//       return res.status(401).json({ success: false, error: "Unauthorized" });
//     }

//     const { data, error } = await supabase
//       .from("comments")
//       .update({ content: content.trim(), is_edited: true })
//       .eq("id", commentId)
//       .eq("user_id", userId)
//       .select()
//       .single();
//     if (error) {
//       if (error.code === "PGRST116") {
//         return res.status(404).json({
//           success: false,
//           error: "Comment not found or not authorized",
//         });
//       }
//       return res.status(500).json({ success: false, error: error.message });
//     }
//     if (!data) {
//       return res.status(404).json({
//         success: false,
//         error: "Comment not found or not authorized",
//       });
//     }
//     return res.status(200).json({ success: true, data });
//   } catch (error) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// }

// ============================================
// Join Request Functions (Private Communities)
// ============================================

export async function requestToJoin(req, res, next) {
  try {
    const { id: communityId } = req.params;
    const userId = req.user?.id;
    const { message } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Verify community exists and is private
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, privacy, creator_id, name")
      .eq("id", communityId)
      .single();

    if (communityError || !community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found" });
    }

    if (community.privacy !== "private") {
      return res.status(400).json({
        success: false,
        error: "This community is public. You can join directly.",
      });
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      return res.status(409).json({
        success: false,
        error: "You are already a member of this community",
      });
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from("community_join_requests")
      .select("id, status")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .single();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(409).json({
          success: false,
          error: "You already have a pending request",
        });
      }
      // If previously rejected, allow re-request by updating
      if (existingRequest.status === "rejected") {
        const { error: updateError } = await supabase
          .from("community_join_requests")
          .update({
            status: "pending",
            message: message || null,
            reviewed_by: null,
            reviewed_at: null,
            created_at: new Date().toISOString(),
          })
          .eq("id", existingRequest.id);

        if (updateError) throw updateError;
      }
    } else {
      // Create new request
      const { error: insertError } = await supabase
        .from("community_join_requests")
        .insert({
          community_id: communityId,
          user_id: userId,
          message: message || null,
        });

      if (insertError) throw insertError;
    }

    // Notify the community creator
    try {
      const { data: requester } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .single();

      await createNotification({
        userId: community.creator_id,
        actorId: userId,
        type: "join_request",
        title: `${requester?.username || "Someone"} wants to join ${community.name}`,
        data: { community_id: communityId },
      });
    } catch (notifErr) {
      logger.error("Join request notification error:", notifErr);
    }

    return res
      .status(201)
      .json({ success: true, message: "Join request sent" });
  } catch (error) {
    next(error);
  }
}

export async function getJoinRequests(req, res, next) {
  try {
    const { id: communityId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Verify user is the community creator
    const { data: community } = await supabase
      .from("communities")
      .select("creator_id")
      .eq("id", communityId)
      .single();

    if (!community || community.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only the community creator can view join requests",
      });
    }

    const { data, error } = await supabase
      .from("community_join_requests")
      .select("*, user:users!community_join_requests_user_id_fkey(id, username, avatar_url, full_name)")
      .eq("community_id", communityId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
}

export async function handleJoinRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, error: "Action must be 'approve' or 'reject'" });
    }

    // Get the request and verify ownership
    const { data: joinRequest, error: requestError } = await supabase
      .from("community_join_requests")
      .select("*, community:communities!community_join_requests_community_id_fkey(id, creator_id, name)")
      .eq("id", requestId)
      .single();

    if (requestError || !joinRequest) {
      return res
        .status(404)
        .json({ success: false, error: "Join request not found" });
    }

    if (joinRequest.community?.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only the community creator can handle join requests",
      });
    }

    if (joinRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: `This request has already been ${joinRequest.status}`,
      });
    }

    // Update the request status
    const { error: updateError } = await supabase
      .from("community_join_requests")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    // If approved, add user to community via atomic RPC
    if (action === "approve") {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "join_community_atomic",
        {
          p_community_id: joinRequest.community_id,
          p_user_id: joinRequest.user_id,
        },
      );

      if (rpcError) throw rpcError;

      if (rpcResult && !rpcResult.success) {
        logger.error("Join community atomic failed:", rpcResult);
      }
    }

    // Notify the requester
    try {
      const communityName = joinRequest.community?.name || "the community";
      const notifTitle =
        action === "approve"
          ? `Your request to join ${communityName} was approved!`
          : `Your request to join ${communityName} was declined`;

      await createNotification({
        userId: joinRequest.user_id,
        actorId: userId,
        type: "join_request",
        title: notifTitle,
        data: {
          community_id: joinRequest.community_id,
          action,
        },
      });
    } catch (notifErr) {
      logger.error("Join request response notification error:", notifErr);
    }

    return res.status(200).json({
      success: true,
      message: `Request ${action === "approve" ? "approved" : "rejected"}`,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelJoinRequest(req, res, next) {
  try {
    const { id: communityId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { error } = await supabase
      .from("community_join_requests")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) throw error;

    return res
      .status(200)
      .json({ success: true, message: "Join request cancelled" });
  } catch (error) {
    next(error);
  }
}

export async function getJoinRequestStatus(req, res, next) {
  try {
    const { id: communityId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("community_join_requests")
      .select("id, status, created_at")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return res.status(200).json({
      success: true,
      data: data || null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPendingRequestsCount(req, res, next) {
  try {
    const { id: communityId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Verify user is the community creator
    const { data: community } = await supabase
      .from("communities")
      .select("creator_id")
      .eq("id", communityId)
      .single();

    if (!community || community.creator_id !== userId) {
      return res
        .status(403)
        .json({ success: false, error: "Unauthorized" });
    }

    const { count, error } = await supabase
      .from("community_join_requests")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "pending");

    if (error) throw error;

    return res.status(200).json({ success: true, count: count || 0 });
  } catch (error) {
    next(error);
  }
}