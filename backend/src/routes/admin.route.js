import Router from "express";
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
  login,
} from "../controllers/admin.controller.js";

const router = Router();

//Auth
router.post("/login", login);

//dashboard
router.get("/dashboard/stats", getDashboardStats);

//system
router.get("/system/health", getSystemHealth);

//users
router.get("/users", getAllUsers);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

//finances
router.get("/payouts", getFinancesStatus);
router.get("/payouts/history", getTransactionsHistory);
router.post("/payouts/process-all", processAllPayouts);
router.post("/payouts/process-single/:id", processSinglePayout);

//moderations
router.get("/moderations", getModerations);
router.put("/moderations/:id", updateModeration);
// Note: Delete endpoint removed - we keep reports for audit trail even after banning

export default router;
