import express from "express";
import { auth } from "../middlewares/auth.js";
import { submitReport } from "../controllers/report.controller.js";

const router = express.Router();

router.use(auth);

router.post("/report", submitReport);

export default router;
