import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  deleteProfile,
  getNotifications,
  getProfile,
  markNotificationAsRead,
  searchProfiles,
  updateProfile,
} from "../controllers/profile.controller.js";

const router = Router();

router.use(auth);

// Move specific routes ABOVE wildcards to avoid shadowing
router.get("/notifications/list", getNotifications);
router.put("/notifications/:id", markNotificationAsRead);
router.get("/search", searchProfiles);

// Wildcard routes last
router.get("/user/:id", getProfile);
router.put("/user/:id", updateProfile);
router.delete("/user/:id", deleteProfile);

export default router;
