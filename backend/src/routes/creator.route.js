import {
  submitVerification,
  getVerificationStatus,
  getCreatorStats,
  getCreatorProfile,
  updateCreatorProfile,
  deleteCreatorProfile,
} from "../controllers/creator.controller.js";
import { auth } from "../middlewares/auth.js";
import { Router } from "express";

const router = Router();

// Creator Verification - User facing
router.post("/verify", auth, submitVerification);
router.get("/verification-status", auth, getVerificationStatus);

router.get("/stats/:id", auth, getCreatorStats);

router.get("/profile/:id", auth, getCreatorProfile);
router.put("/profile/:id", auth, updateCreatorProfile);
router.delete("/profile/:id", auth, deleteCreatorProfile);

export default router;
