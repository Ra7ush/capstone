import supabase from "../config/db.js";

// ============ POSTS ============

export async function createPost(req, res) {
  try {
    const { content, images } = req.body;
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

    const {
      data: posts,
      error,
      count,
    } = await supabase
      .from("posts")
      .select(
        "*, user:users(id, username, email, followers_count, following_count, creators(bio))",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (userId && posts) {
      // 1. Check likes
      const { data: userLikes } = await supabase
        .from("likes")
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
        }
      });
    } else if (posts) {
      posts.forEach((post) => {
        if (post.user) {
          post.user.bio = post.user.creators?.bio;
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
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", id)
      .eq("user_id", userId)
      .single();

    if (existingLike) {
      return res
        .status(400)
        .json({ success: false, error: "Already liked this post" });
    }

    const { error } = await supabase.from("likes").insert({
      post_id: id,
      user_id: userId,
    });
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    // Increment likes_count
    const { error: rpcError } = await supabase.rpc("increment_likes", {
      post_id: id,
    });
    if (rpcError) {
      console.error("Failed to increment likes count:", rpcError);
      // Consider rolling back the like insert or logging for reconciliation
    }

    return res.status(200).json({ success: true, message: "Post liked" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function unlikePost(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { error, count } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", id)
      .eq("user_id", userId)
      .select("*", { count: "exact", head: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Decrement likes_count
    if (count && count > 0) {
      await supabase.rpc("decrement_likes", { post_id: id });
    }
    return res.status(200).json({ success: true, message: "Post unliked" });
  } catch (error) {
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
