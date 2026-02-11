import supabase from "../config/db.js";
import { logger } from "../config/logger.js";

// ============================================
// Notification Helper — used by other controllers
// ============================================

/**
 * Create a notification and broadcast it via Supabase Realtime.
 *
 * @param {Object} opts
 * @param {string} opts.userId    - Who receives the notification
 * @param {string} opts.actorId   - Who triggered it
 * @param {string} opts.type      - Notification type (follow, message, etc.)
 * @param {string} opts.title     - Short display title
 * @param {string} [opts.body]    - Optional longer description
 * @param {Object} [opts.data]    - Flexible payload (post_id, community_id, etc.)
 */
export async function createNotification({
  userId,
  actorId,
  type,
  title,
  body = null,
  data = {},
}) {
  try {
    // Don't notify yourself
    if (userId === actorId) return null;

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        actor_id: actorId,
        type,
        title,
        body,
        data,
      })
      .select(
        `
        *,
        actor:users!notifications_actor_id_fkey(id, username, profile_image_url)
      `,
      )
      .single();

    if (error) {
      logger.error("Error creating notification:", error);
      return null;
    }

    // Broadcast via Supabase Realtime so the mobile app gets it instantly
    try {
      const channel = supabase.channel(`notifications:${userId}`);
      await channel.send({
        type: "broadcast",
        event: "new_notification",
        payload: notification,
      });
      await supabase.removeChannel(channel);
    } catch (broadcastErr) {
      logger.error("Notification broadcast failed:", broadcastErr);
      // Non-fatal — notification is saved in DB
    }

    return notification;
  } catch (err) {
    logger.error("createNotification error:", err);
    return null;
  }
}

// ============================================
// REST API Handlers
// ============================================

/**
 * GET /api/notifications
 * Fetch paginated notifications for the authenticated user.
 */
export async function getNotifications(req, res, next) {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { data, error, count } = await supabase
      .from("notifications")
      .select(
        `
        *,
        actor:users!notifications_actor_id_fkey(id, username, profile_image_url)
      `,
        { count: "exact" },
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: offset + parseInt(limit) < count,
    });
  } catch (error) {
    logger.error("getNotifications error:", error);
    next(error);
  }
}

/**
 * GET /api/notifications/unread-count
 * Get the count of unread notifications.
 */
export async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: { count: count || 0 },
    });
  } catch (error) {
    logger.error("getUnreadCount error:", error);
    next(error);
  }
}

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 */
export async function markAsRead(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId); // Ensure user owns this notification

    if (error) throw error;

    return res
      .status(200)
      .json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    logger.error("markAsRead error:", error);
    next(error);
  }
}

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
export async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    return res
      .status(200)
      .json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    logger.error("markAllAsRead error:", error);
    next(error);
  }
}

/**
 * DELETE /api/notifications/:id
 * Delete a single notification.
 */
export async function deleteNotification(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return res
      .status(200)
      .json({ success: true, message: "Notification deleted" });
  } catch (error) {
    logger.error("deleteNotification error:", error);
    next(error);
  }
}

/**
 * DELETE /api/notifications
 * Clear all notifications for the authenticated user.
 */
export async function clearAllNotifications(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    return res
      .status(200)
      .json({ success: true, message: "All notifications cleared" });
  } catch (error) {
    logger.error("clearAllNotifications error:", error);
    next(error);
  }
}
