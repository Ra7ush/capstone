import { Router } from "express";
import { submitVerification } from "../controllers/verification.controller.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

// Creator Verification - User facing
router.post("/verify", auth, submitVerification);

export default router;
