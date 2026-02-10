import supabase from "../config/db.js";
import { logger } from "../config/logger.js";
import { createNotification } from "./notification.controller.js";

// ============================================
// Review Controllers
// ============================================

/**
 * Create or update a review for a purchased service
 * POST /api/reviews
 */
export async function createReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { service_id, rating, review_text } = req.body;

    if (!service_id || !rating) {
      return res
        .status(400)
        .json({ success: false, error: "service_id and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ success: false, error: "Rating must be between 1 and 5" });
    }

    // Verify user has purchased this service
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("service_id", service_id)
      .eq("status", "completed")
      .maybeSingle();

    if (purchaseError) throw purchaseError;

    if (!purchase) {
      return res.status(403).json({
        success: false,
        error: "You must purchase this service before reviewing it",
      });
    }

    // Upsert the review (one review per user per service)
    const { data, error } = await supabase
      .from("service_reviews")
      .upsert(
        {
          service_id,
          user_id: userId,
          rating,
          review_text: review_text || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,service_id" },
      )
      .select(
        `
        *,
        user:users!service_reviews_user_id_fkey(id, username, profile_image_url)
      `,
      )
      .single();

    if (error) throw error;

    // Get service info for notification
    const { data: service } = await supabase
      .from("services")
      .select("title, creator_id")
      .eq("id", service_id)
      .single();

    // Notify creator about the review
    if (service && service.creator_id !== userId) {
      await createNotification({
        userId: service.creator_id,
        actorId: userId,
        type: "system",
        title: "New Review",
        body: `Someone left a ${rating}-star review on "${service.title}"`,
        data: { service_id, review_id: data.id },
      });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error("Create review error:", error);
    next(error);
  }
}

/**
 * Update own review
 * PUT /api/reviews/:id
 */
export async function updateReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { rating, review_text } = req.body;

    const update = { updated_at: new Date().toISOString() };
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res
          .status(400)
          .json({ success: false, error: "Rating must be between 1 and 5" });
      }
      update.rating = rating;
    }
    if (review_text !== undefined) update.review_text = review_text || null;

    const { data, error } = await supabase
      .from("service_reviews")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId)
      .select(
        `
        *,
        user:users!service_reviews_user_id_fkey(id, username, profile_image_url)
      `,
      )
      .single();

    if (error) throw error;
    if (!data) {
      return res
        .status(404)
        .json({ success: false, error: "Review not found" });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Update review error:", error);
    next(error);
  }
}

/**
 * Delete own review
 * DELETE /api/reviews/:id
 */
export async function deleteReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from("service_reviews")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    logger.error("Delete review error:", error);
    next(error);
  }
}

/**
 * Get reviews for a service (paginated)
 * GET /api/reviews/service/:serviceId
 */
export async function getServiceReviews(req, res, next) {
  try {
    const { serviceId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "newest"; // newest, oldest, highest, lowest
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from("service_reviews")
      .select("id", { count: "exact", head: true })
      .eq("service_id", serviceId);

    if (countError) throw countError;

    // Build query with sorting
    let query = supabase
      .from("service_reviews")
      .select(
        `
        *,
        user:users!service_reviews_user_id_fkey(id, username, profile_image_url)
      `,
      )
      .eq("service_id", serviceId)
      .range(offset, offset + limit - 1);

    switch (sort) {
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "highest":
        query = query.order("rating", { ascending: false });
        break;
      case "lowest":
        query = query.order("rating", { ascending: true });
        break;
      default: // newest
        query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
      total: count || 0,
      page,
      limit,
      hasMore: offset + limit < (count || 0),
    });
  } catch (error) {
    logger.error("Get service reviews error:", error);
    next(error);
  }
}

/**
 * Get review stats for a service (rating distribution)
 * GET /api/reviews/service/:serviceId/stats
 */
export async function getReviewStats(req, res, next) {
  try {
    const { serviceId } = req.params;

    // Get all ratings for this service to compute distribution
    const { data, error } = await supabase
      .from("service_reviews")
      .select("rating")
      .eq("service_id", serviceId);

    if (error) throw error;

    const total = data.length;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    data.forEach((review) => {
      distribution[review.rating]++;
      sum += review.rating;
    });

    const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    // Convert distribution to percentages
    const percentages = {};
    for (let i = 1; i <= 5; i++) {
      percentages[i] =
        total > 0 ? Math.round((distribution[i] / total) * 100) : 0;
    }

    res.status(200).json({
      success: true,
      data: {
        average,
        total,
        distribution,
        percentages,
      },
    });
  } catch (error) {
    logger.error("Get review stats error:", error);
    next(error);
  }
}

/**
 * Get current user's review for a service
 * GET /api/reviews/service/:serviceId/mine
 */
export async function getMyReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { serviceId } = req.params;

    const { data, error } = await supabase
      .from("service_reviews")
      .select(
        `
        *,
        user:users!service_reviews_user_id_fkey(id, username, profile_image_url)
      `,
      )
      .eq("service_id", serviceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Get my review error:", error);
    next(error);
  }
}
