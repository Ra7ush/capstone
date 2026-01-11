import {
  submitVerification,
  getVerificationStatus,
} from "../controllers/verification.controller.js";
import { auth } from "../middlewares/auth.js";
import { Router } from "express";

const router = Router();

// Creator Verification - User facing
router.post("/verify", auth, submitVerification);
router.get("/verification-status", auth, getVerificationStatus);

export default router;
