import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notification.controller.js";

const router = Router();

// All notification routes require authentication
router.use(auth);

// GET  /api/notifications            → paginated list
// GET  /api/notifications/unread-count → unread badge count
// PUT  /api/notifications/read-all    → mark all as read
// PUT  /api/notifications/:id/read    → mark one as read
// DEL  /api/notifications/:id         → delete one
// DEL  /api/notifications             → clear all

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);
router.delete("/", clearAllNotifications);

export default router;
