import { Router } from "express";
import {
  getAllUsers,
  updateUser,
  deleteUser,
  getFinancesStatus,
  getTransactionsHistory,
  processAllPayouts,
  getDashboardStats,
  getSystemHealth,
  processSinglePayout,
  getModerations,
  updateModeration,
  // deleteModeration,
  verifyAdmin,
} from "../controllers/admin.controller.js";
import {
  getPendingRequests,
  updateRequestStatus,
} from "../controllers/verification.controller.js";
import { adminAuth } from "../middlewares/adminAuth.js";
import {
  validateRequest,
  loginSchema,
  idParamSchema,
  updateUserSchema,
  updateModerationSchema,
  dashboardQuerySchema,
  updateVerificationStatusSchema,
} from "../validators/schemas.js";

const router = Router();

//Auth Verification
router.get("/verify", adminAuth, verifyAdmin);

// All routes below require admin authentication
router.use(adminAuth);

//dashboard
router.get(
  "/dashboard/stats",
  validateRequest({ query: dashboardQuerySchema }),
  getDashboardStats
);

//system
router.get("/system/health", getSystemHealth);

//users
router.get("/users", getAllUsers);
router.put(
  "/users/:id",
  validateRequest({ params: idParamSchema, body: updateUserSchema }),
  updateUser
);
router.delete(
  "/users/:id",
  validateRequest({ params: idParamSchema }),
  deleteUser
);

//finances
router.get("/payouts", getFinancesStatus);
router.get("/payouts/history", getTransactionsHistory);
router.post("/payouts/process-all", processAllPayouts);
router.post(
  "/payouts/process-single/:id",
  validateRequest({ params: idParamSchema }),
  processSinglePayout
);

//moderations
router.get("/moderations", getModerations);
router.put(
  "/moderations/:id",
  validateRequest({ params: idParamSchema, body: updateModerationSchema }),
  updateModeration
);

//creator verification
router.get("/verifications/pending", getPendingRequests);
router.put(
  "/verifications/:id/status",
  validateRequest({
    params: idParamSchema,
    body: updateVerificationStatusSchema,
  }),
  updateRequestStatus
);
// Note: Delete endpoint removed - we keep reports for audit trail even after banning

export default router;
