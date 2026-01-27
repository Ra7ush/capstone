import supabase from "../config/db.js";
import { getOrSet, invalidatePattern } from "../config/redis.js";
import { logger } from "../config/logger.js";

export async function getProfile(req, res, next) {
  try {
    const { id } = req.params;
    const cacheKey = `profile:${id}`;
    logger.debug(`[getProfile] id=${id} cacheKey=${cacheKey}`);

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
    const { full_name, username, bio } = req.body;
    const authenticatedUserId = req.user?.id;

    logger.info("PUT /api/profile", {
      id,
      full_name,
      username,
      bio,
      authenticatedUserId,
    });

    // Security check: confirm the user is updating themselves
    if (id !== authenticatedUserId) {
      logger.warn("Unauthorized update attempt:", { id, authenticatedUserId });
      return res
        .status(403)
        .json({ success: false, error: "Unauthorized update" });
    }

    // 1. Update core user table
    const userUpdates = {};
    if (full_name !== undefined) userUpdates.full_name = full_name;
    if (username !== undefined) userUpdates.username = username;

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

    // 2. Update creator bio if it exists
    if (bio !== undefined) {
      const { error: creatorError } = await supabase
        .from("creators")
        .update({ bio })
        .eq("user_id", id);

      if (creatorError) {
        logger.error("Supabase error updating creator bio:", creatorError);
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

    const { data, error } = await supabase
      .from("users")
      .select("id, username, full_name, role, profile_image_url")
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
