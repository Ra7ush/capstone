import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  getRecommendations,
  chatTutor,
  generateDescription,
  smartSearch,
  summarizeContent,
} from "../controllers/ai.controller.js";

const router = Router();

// All AI routes require authentication
router.use(auth);

// 1. AI Course Recommendations
router.get("/recommendations", getRecommendations);

// 2. AI Chat Tutor
router.post("/chat", chatTutor);

// 3. AI Course Description Generator
router.post("/generate-description", generateDescription);

// 4. AI Smart Search
router.post("/smart-search", smartSearch);

// 5. AI Content Summarizer// TODO : Change the pos to the Moudle tab where the creator summirize by using the ai
router.post("/summarize", summarizeContent);

export default router;
