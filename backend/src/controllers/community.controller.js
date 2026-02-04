import supabase from "../config/db.js";
import { getOrSet, invalidatePattern } from "../config/redis.js";
import { logger } from "../config/logger.js";

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
    const { category } = req.query;

    let query = supabase
      .from("communities")
      .select("*, creator:users!communities_creator_id_fkey(id, username)")
      .eq("privacy", "public");

    const isValidCategory =
      category &&
      category !== "All" &&
      category !== "null" &&
      category !== "undefined";
    if (isValidCategory) {
      query = query.eq("category", category);
    }

    // If userId is provided, exclude communities already joined
    if (userId) {
      const { data: joined } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);

      const joinedIds = joined?.map((j) => j.community_id) || [];
      if (joinedIds.length > 0) {
        query = query.not("id", "in", `(${joinedIds.join(",")})`);
      }
    }

    const { data, error } = await query
      .order("members_count", { ascending: false })
      .limit(20);

    if (error) {
      logger.error("Discover Communities Error:", error);
      throw error;
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

        const isValidCommunityId =
          communityId && communityId !== "null" && communityId !== "undefined";
        if (isValidCommunityId) {
          query = query.eq("community_id", communityId);
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
