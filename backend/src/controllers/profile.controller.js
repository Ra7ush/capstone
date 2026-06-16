import supabase from "../config/db.js";
import { getOrSet, invalidatePattern } from "../config/redis.js";
import { logger } from "../config/logger.js";

export async function getProfile(req, res, next) {
  try {
    const id = req.params.id || req.user?.id;
    const currentUserId = req.user?.id;
    const cacheKey = `profile:${id}`;
    logger.debug(`[getProfile] id=${id} cacheKey=${cacheKey}`);

    // 1. Block Check (Don't check if viewing self)
    if (currentUserId && id !== currentUserId) {
      const { data: blockCheck } = await supabase
        .from("user_blocks")
        .select("id")
        .or(
          `and(blocker_id.eq.${currentUserId},blocked_id.eq.${id}),and(blocker_id.eq.${id},blocked_id.eq.${currentUserId})`,
        )
        .maybeSingle();

      if (blockCheck) {
        return res.status(403).json({
          success: false,
          error: "This profile is unavailable due to privacy settings",
        });
      }
    }

    const data = await getOrSet(
      cacheKey,
      async () => {
        logger.debug(
          `[getProfile] Cache miss -> fetching from Supabase for ${id}`,
        );
        const { data, error } = await supabase
          .from("users")
          .select("*, creators(*)")
          .eq("id", id)
          .single();

        if (error) {
          logger.error("[getProfile] Supabase error:", error);
          throw error;
        }
        logger.debug(
          `[getProfile] Supabase fetch success, will cache key: ${cacheKey}`,
        );
        return data;
      },
      3600,
    );

    if (!data) {
      return res
        .status(404)
        .json({ success: false, error: "Profile not found" });
    }

    // Flatten logic for cleaner frontend consumption
    if (data.creators) {
      data.bio = data.creators.bio;
      data.verification_status = data.creators.verification_status;
      data.category = data.creators.category;
      data.average_rating = data.creators.average_rating;
      data.total_ratings = data.creators.total_ratings;
      data.subscription_plan = data.creators.subscription_plan;
    }

    logger.debug(`[getProfile] Returning profile for id=${id}`);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { id } = req.params;
    const {
      full_name,
      username,
      bio,
      cover_image_url,
      profile_image_url,
      category,
    } = req.body;
    const authenticatedUserId = req.user?.id;

    logger.info("PUT /api/profile", {
      id,
      full_name,
      username,
      bio,
      cover_image_url: cover_image_url ? "[URL]" : undefined,
      profile_image_url: profile_image_url ? "[URL]" : undefined,
      category,
      authenticatedUserId,
    });

    // Security check: confirm the user is updating themselves
    if (id !== authenticatedUserId) {
      logger.warn("Unauthorized update attempt:", { id, authenticatedUserId });
      return res
        .status(403)
        .json({ success: false, error: "Unauthorized update" });
    }

    // Fetch current user data to check for old images to delete
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("cover_image_url, profile_image_url")
      .eq("id", id)
      .single();

    if (fetchError) {
      logger.error(
        "Error fetching current user for image cleanup:",
        fetchError,
      );
      // Proceeding without cleanup to avoid blocking the update
    } else {
      // Helper to extract path from URL and delete from storage
      const deleteOldImage = async (url) => {
        try {
          if (!url) return;
          // URL format: .../storage/v1/object/public/community/profiles/filename.jpg
          // We need just "profiles/filename.jpg" (assuming bucket is "community")
          const urlParts = url.split("/community/");
          if (urlParts.length === 2) {
            const path = urlParts[1];
            logger.debug(`[updateProfile] Deleting old image: ${path}`);
            const { error: removeError } = await supabase.storage
              .from("community")
              .remove([path]);
            if (removeError) {
              logger.error(
                `[updateProfile] Failed to delete old image ${path}:`,
                removeError,
              );
            }
          }
        } catch (err) {
          logger.error("[updateProfile] Image cleanup error:", err);
        }
      };

      // Check and delete old cover image
      if (
        cover_image_url &&
        currentUser.cover_image_url &&
        cover_image_url !== currentUser.cover_image_url
      ) {
        await deleteOldImage(currentUser.cover_image_url);
      }

      // Check and delete old profile image
      if (
        profile_image_url &&
        currentUser.profile_image_url &&
        profile_image_url !== currentUser.profile_image_url
      ) {
        await deleteOldImage(currentUser.profile_image_url);
      }
    }

    // 1. Update core user table
    const userUpdates = {};
    if (full_name !== undefined) userUpdates.full_name = full_name;
    if (username !== undefined) userUpdates.username = username;
    if (cover_image_url !== undefined)
      userUpdates.cover_image_url = cover_image_url;
    if (profile_image_url !== undefined)
      userUpdates.profile_image_url = profile_image_url;
    if (req.body.is_public !== undefined)
      userUpdates.is_public = req.body.is_public;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabase
        .from("users")
        .update(userUpdates)
        .eq("id", id);

      if (userError) {
        logger.error("Supabase error updating user:", userError);
        throw userError;
      }
    }

    // 2. Update creator fields if any creator-specific data provided
    const creatorUpdates = {};
    if (bio !== undefined) creatorUpdates.bio = bio;
    if (category !== undefined) creatorUpdates.category = category;

    if (Object.keys(creatorUpdates).length > 0) {
      const { error: creatorError } = await supabase
        .from("creators")
        .update(creatorUpdates)
        .eq("user_id", id);

      if (creatorError) {
        logger.error("Supabase error updating creator:", creatorError);
        throw creatorError;
      }
    }

    // 3. Invalidate cache for this profile
    const cacheKey = `profile:${id}`;
    await invalidatePattern(cacheKey);
    logger.debug("[updateProfile] Cache invalidated for:", cacheKey);

    return res
      .status(200)
      .json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    next(error);
  }
}

export async function deleteProfile(req, res, next) {
  try {
    const { id } = req.params;
    const authenticatedUserId = req.user?.id;

    if (id !== authenticatedUserId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;

    // Invalidate cache for this profile
    const cacheKey = `profile:${id}`;
    await invalidatePattern(cacheKey);
    logger.debug("[deleteProfile] Cache invalidated for:", cacheKey);

    return res.status(200).json({ success: true, message: "Profile deleted" });
  } catch (error) {
    next(error);
  }
}

export async function getNotifications(req, res, next) {
  try {
    return res.status(200).json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationAsRead(req, res, next) {
  try {
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}
export async function searchProfiles(req, res, next) {
  try {
    const { q } = req.query;
    logger.info(`GET /api/profile/search q=${q}`);

    if (!q || q.length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const normalizedQ = q.startsWith("@") ? q.substring(1) : q;
    const escapedQ = normalizedQ.replace(/[%_\\]/g, "\\$&");
    logger.debug(
      `[Search] Original: "${q}", Normalized: "${normalizedQ}", Current User: ${req.user.id}`,
    );

    const { data: blockedData, error: blockedError } = await supabase
      .from("user_blocks")
      .select("blocked_id, blocker_id")
      .or(`blocker_id.eq.${req.user.id},blocked_id.eq.${req.user.id}`);

    if (blockedError) throw blockedError;

    const blockedIds = [
      ...new Set([
        ...blockedData.map((b) => b.blocked_id),
        ...blockedData.map((b) => b.blocker_id),
      ]),
    ];

    let query = supabase
      .from("users")
      .select("id, username, full_name, role, profile_image_url")
      .eq("is_public", true);

    if (blockedIds.length > 0) {
      query = query.not("id", "in", `(${blockedIds.join(",")})`);
    }

    const { data, error } = await query
      .or(`username.ilike.*${escapedQ}*,full_name.ilike.*${escapedQ}*`)
      .neq("id", req.user.id) // Don't include self
      .limit(10);

    logger.debug(`[Search] Found ${data?.length || 0} users for "${escapedQ}"`);
    if (data)
      logger.debug(`[Search] Result IDs: ${data.map((u) => u.id).join(", ")}`);
    if (error) {
      logger.error("Supabase error in searchProfiles:", error);
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getUserPosts(req, res, next) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    logger.debug(`[getUserPosts] Fetching posts for user ${id}, page ${page}`);

    // Get posts by this user with pagination
    const {
      data: posts,
      error,
      count,
    } = await supabase
      .from("posts")
      .select(
        `
        id,
        user_id,
        content,
        images,
        created_at,
        likes_count,
        comments_count
      `,
        { count: "exact" },
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      logger.error("[getUserPosts] Supabase error:", error);
      throw error;
    }

    // Check if the current user has liked these posts
    let likedPostIds = new Set();
    const currentUserId = req.user?.id;
    if (currentUserId && posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likesData, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);

      if (!likesError && likesData) {
        likedPostIds = new Set(likesData.map((l) => l.post_id));
      }
    }

    // Enrich posts with has_liked
    const enrichedPosts = posts.map((post) => ({
      ...post,
      has_liked: likedPostIds.has(post.id),
    }));

    // Get total likes across all posts for "Post likes" stat
    const { data: likeStats, error: likeError } = await supabase
      .from("posts")
      .select("likes_count")
      .eq("user_id", id);

    const totalLikes =
      likeStats?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0;

    return res.status(200).json({
      success: true,
      data: {
        posts: enrichedPosts || [],
        total: count || 0,
        totalLikes,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: offset + posts?.length < count,
      },
    });
  } catch (error) {
    next(error);
  }
}
