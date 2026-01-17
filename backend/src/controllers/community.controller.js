import supabase from "../config/db.js";

// ============ COMMUNITIES ============

export async function createCommunity(req, res) {
  try {
    const { name, description, banner_url, privacy, category } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // 1. Check if user is a creator
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return res
        .status(500)
        .json({ success: false, error: "Failed to verify user role" });
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
      return res
        .status(500)
        .json({ success: false, error: existingError.message });
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
      return res
        .status(500)
        .json({ success: false, error: communityError.message });
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
      console.error("Error joining creator to community:", memberError);
      // Rollback: delete the community
      await supabase.from("communities").delete().eq("id", community.id);
      return res.status(500).json({
        success: false,
        error: "Failed to initialize community membership",
      });
    }

    return res.status(201).json({ success: true, data: community });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getDiscoverCommunities(req, res) {
  try {
    const userId = req.user?.id;
    const { category } = req.query;

    let query = supabase
      .from("communities")
      .select("*, creator:users(id, username)")
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
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getJoinedCommunities(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("community_members")
      .select(
        "role, joined_at, community:communities(*, creator:users(id, username))"
      )
      .eq("user_id", userId);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function joinCommunity(req, res) {
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
      return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function leaveCommunity(req, res) {
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
      return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getCommunityById(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("communities")
      .select("*, creator:users(id, username)")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============ POSTS ============

export async function createPost(req, res) {
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
      .select("*, user:users(id, username, email, creators(bio))")
      .single();

    if (data?.user) {
      data.user.bio = data.user.creators?.bio;
    }

    if (error) {
      console.error("Supabase error creating post:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Exception creating post:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getFeed(req, res) {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const communityId = req.query.community_id;

    let query = supabase
      .from("posts")
      .select(
        "*, user:users(id, username, email, followers_count, following_count, creators(bio, verification_status)), community:communities(*)",
        { count: "exact" }
      );

    const isValidCommunityId =
      communityId && communityId !== "null" && communityId !== "undefined";
    if (isValidCommunityId) {
      query = query.eq("community_id", communityId);
    } else {
      // If no communityId, maybe show only global posts or posts from joined communities?
      // For now, let's just show all posts if no filter is applied.
    }

    const {
      data: posts,
      error,
      count,
    } = await query.order("created_at", { ascending: false }).range(from, to);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

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
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPostById(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("posts")
      .select("*, user:users(id, username, email, creators(bio))")
      .eq("id", id)
      .single();

    if (data?.user) {
      data.user.bio = data.user.creators?.bio;
    }

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function updatePost(req, res) {
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
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function deletePost(req, res) {
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
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============ LIKES ============

export async function likePost(req, res) {
  const { id: post_id } = req.params;
  const user_id = req.user?.id;
  console.log(`[DEBUG] likePost called - Post: ${post_id}, User: ${user_id}`);

  try {
    if (!user_id)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    // UUID Validation (Defensive)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(post_id)) {
      console.error(`[DEBUG] Invalid UUID format for post_id: ${post_id}`);
      return res
        .status(400)
        .json({ success: false, error: "Invalid post ID format" });
    }

    // 1. Attempt Atomic RPC
    console.log("[DEBUG] Attempting handle_post_like RPC...");
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "handle_post_like",
      {
        p_post_id: post_id,
        p_user_id: user_id,
        p_action: "like",
      }
    );

    if (!rpcError) {
      console.log("[DEBUG] RPC Success");
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      return res.status(200).json({
        success: true,
        message: "Post liked (atomic)",
        likes_count: result?.new_likes_count ?? 0,
        has_liked: result?.new_has_liked ?? true,
      });
    }

    console.log(`[DEBUG] RPC Failed with code: ${rpcError.code}`);

    // 2. Fallback Path
    if (rpcError.code === "PGRST202") {
      console.log("[DEBUG] RPC not found, running fallback...");

      const { data: existingLike, error: checkError } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", post_id)
        .eq("user_id", user_id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existingLike) {
        console.log("[DEBUG] Inserting new like...");
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

        console.log("[DEBUG] Calling increment_likes fallback...");
        await supabase.rpc("increment_likes", { post_id });
      }

      console.log("[DEBUG] Fetching final count...");
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

    console.error("[DEBUG] Unexpected RPC Error:", rpcError);
    return res.status(500).json({ success: false, error: rpcError.message });
  } catch (error) {
    console.error("[DEBUG] Catch Block hit in likePost:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function unlikePost(req, res) {
  const { id: post_id } = req.params;
  const user_id = req.user?.id;
  console.log(`[DEBUG] unlikePost called - Post: ${post_id}, User: ${user_id}`);

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

    console.log("[DEBUG] Attempting handle_post_like RPC for unlike...");
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "handle_post_like",
      {
        p_post_id: post_id,
        p_user_id: user_id,
        p_action: "unlike",
      }
    );

    if (!rpcError) {
      console.log("[DEBUG] RPC Unlike Success");
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      return res.status(200).json({
        success: true,
        message: "Post unliked (atomic)",
        likes_count: result?.new_likes_count ?? 0,
        has_liked: result?.new_has_liked ?? false,
      });
    }

    console.log(`[DEBUG] RPC Unlike Failed with code: ${rpcError.code}`);

    if (rpcError.code === "PGRST202") {
      console.log("[DEBUG] RPC not found, running unlike fallback...");

      const { error: deleteError } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post_id)
        .eq("user_id", user_id);

      if (deleteError) throw deleteError;

      console.log("[DEBUG] Calling decrement_likes fallback...");
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

    console.error("[DEBUG] Unexpected RPC Unlike Error:", rpcError);
    return res.status(500).json({ success: false, error: rpcError.message });
  } catch (error) {
    console.error("[DEBUG] Catch Block hit in unlikePost:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============ COMMENTS ============

export async function addComment(req, res) {
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
      return res.status(500).json({ success: false, error: error.message });
    }

    // Increment comments_count on post
    await supabase.rpc("increment_comments", { post_id: id });

    // If it's a reply, increment replies_count on the parent comment
    if (parentId) {
      await supabase.rpc("increment_comment_replies", {
        parent_row_id: parentId,
      });
    }

    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getComments(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 1. Fetch comments
    const { data: comments, error } = await supabase
      .from("comments")
      .select("*, user:users(id, username, email, creators(bio))")
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (comments) {
      comments.forEach((c) => {
        if (c.user) {
          c.user.bio = c.user.creators?.bio;
        }
      });
    }

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // 2. Fetch all likes for these comments to get accurate counts and user status
    let commentsWithLikes = comments;
    if (comments.length > 0) {
      const commentIds = comments.map((c) => c.id);

      const { data: allLikes } = await supabase
        .from("comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);

      // Create a map of commentId -> Array of likes
      const likesMap = {};
      allLikes?.forEach((like) => {
        if (!likesMap[like.comment_id]) {
          likesMap[like.comment_id] = [];
        }
        likesMap[like.comment_id].push(like.user_id);
      });

      commentsWithLikes = comments.map((comment) => {
        const likes = likesMap[comment.id] || [];
        return {
          ...comment,
          likes_count: likes.length, // Use actual count from table
          has_liked: userId ? likes.includes(userId) : false,
        };
      });
    }

    return res.status(200).json({ success: true, data: commentsWithLikes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteComment(req, res) {
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
      return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function likeComment(req, res) {
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
      return res.status(500).json({ success: false, error: error.message });
    }

    // Increment likes_count
    await supabase.rpc("increment_comment_likes", {
      comment_row_id: commentId,
    });

    return res.status(200).json({ success: true, message: "Comment liked" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function unlikeComment(req, res) {
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
      return res.status(500).json({ success: false, error: error.message });
    }

    // Decrement likes_count
    await supabase.rpc("decrement_comment_likes", {
      comment_row_id: commentId,
    });

    return res.status(200).json({ success: true, message: "Comment unliked" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function editComment(req, res) {
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
      return res.status(500).json({ success: false, error: error.message });
    }
    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Comment not found or not authorized",
      });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
