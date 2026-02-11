import express from "express";
import {
  createPurchase,
  getPurchases,
} from "../controllers/purchase.controller.js";
import { auth } from "../middlewares/auth.js";

const router = express.Router();

router.use(auth);

router.post("/", createPurchase);
router.get("/", getPurchases);

export default router;
