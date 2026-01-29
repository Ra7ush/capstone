import supabase from "../config/db.js";
import { invalidatePattern } from "../config/redis.js";
import { logger } from "../config/logger.js";

/**
 * Block a user
 */
export async function blockUser(req, res, next) {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;

    if (userId === blockerId) {
      return res
        .status(400)
        .json({ success: false, error: "You cannot block yourself" });
    }

    const { error } = await supabase
      .from("user_blocks")
      .insert({ blocker_id: blockerId, blocked_id: userId });

    if (error) {
      if (error.code === "23505") {
        return res
          .status(400)
          .json({ success: false, error: "User already blocked" });
      }
      throw error;
    }

    // Invalidate affected caches
    await invalidatePattern(`profile:${blockerId}`);
    await invalidatePattern(`profile:${userId}`);

    return res
      .status(200)
      .json({ success: true, message: "User blocked successfully" });
  } catch (error) {
    next(error);
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(req, res, next) {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;

    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .match({ blocker_id: blockerId, blocked_id: userId });

    if (error) throw error;

    // Invalidate affected caches
    await invalidatePattern(`profile:${blockerId}`);
    await invalidatePattern(`profile:${userId}`);

    return res
      .status(200)
      .json({ success: true, message: "User unblocked successfully" });
  } catch (error) {
    next(error);
  }
}

/**
 * List blocked users
 */
export async function getBlockedUsers(req, res, next) {
  try {
    const blockerId = req.user.id;

    const { data, error } = await supabase
      .from("user_blocks")
      .select(
        "blocked_id, users:blocked_id(id, username, full_name, profile_image_url)",
      )
      .eq("blocker_id", blockerId);

    if (error) throw error;

    const blockedUsers = data.map((item) => item.users);

    return res.status(200).json({ success: true, data: blockedUsers });
  } catch (error) {
    next(error);
  }
}
