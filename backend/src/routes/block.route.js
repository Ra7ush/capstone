import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "../controllers/block.controller.js";

const router = express.Router();

// Apply authentication to all block routes
router.use(auth);

router.post("/:userId", blockUser);
router.delete("/:userId", unblockUser);
router.get("/list", getBlockedUsers);

export default router;
