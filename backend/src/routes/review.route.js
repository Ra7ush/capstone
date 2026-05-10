import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  createReview,
  updateReview,
  deleteReview,
  getServiceReviews,
  getReviewStats,
  getMyReview,
  createCreatorRating,
  getCreatorRatings,
  getMyCreatorRating,
} from "../controllers/review.controller.js";

const router = Router();

// All routes require authentication
router.use(auth);

// Course Reviews
// Create a review (POST /api/reviews)
router.post("/", createReview);

// Update own review (PUT /api/reviews/:id)
router.put("/:id", updateReview);

// Delete own review (DELETE /api/reviews/:id)
router.delete("/:id", deleteReview);

// Get reviews for a service (GET /api/reviews/service/:serviceId)
router.get("/service/:serviceId", getServiceReviews);

// Get review stats for a service (GET /api/reviews/service/:serviceId/stats)
router.get("/service/:serviceId/stats", getReviewStats);

// Get current user's review for a service (GET /api/reviews/service/:serviceId/mine)
router.get("/service/:serviceId/mine", getMyReview);

// Creator Ratings
// Create a creator rating (POST /api/reviews/creator)
router.post("/creator", createCreatorRating);

// Get ratings for a creator (GET /api/reviews/creator/:creatorId)
router.get("/creator/:creatorId", getCreatorRatings);

// Get current user's rating for a creator (GET /api/reviews/creator/:creatorId/mine)
router.get("/creator/:creatorId/mine", getMyCreatorRating);

export default router;
