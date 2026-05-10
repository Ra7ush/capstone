import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  getSubscriptionPlans,
  getMySubscription,
  updateSubscriptionPlan,
  cancelSubscription,
} from "../controllers/subscription.controller.js";
import {
  validateRequest,
  subscriptionPlanSchema,
} from "../validators/schemas.js";

const router = express.Router();

// Public plans list
router.get("/plans", getSubscriptionPlans);

// Authenticated endpoints
router.use(auth);

router.get("/me", getMySubscription);
router.put(
  "/plan",
  validateRequest({ body: subscriptionPlanSchema }),
  updateSubscriptionPlan,
);
router.post("/cancel", cancelSubscription);

export default router;
