import supabase from "../config/db.js";
import { getOrSet, invalidatePattern } from "../config/redis.js";
import { logger } from "../config/logger.js";

/**
 * Handle creator verification submission
 */
export async function submitVerification(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      full_legal_name,
      id_type,
      id_front_url,
      id_back_url,
      selfie_url,
      social_links,
      portfolio_url,
    } = req.body;

    // 1. Basic validation
    if (!full_legal_name || !id_type || !id_front_url || !selfie_url) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields (Legal Name, ID Type, ID Front, Selfie)",
      });
    }

    // 2. Check if there's already a pending request
    const { data: existingRequests } = await supabase
      .from("creator_verification_requests")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "pending");
    if (existingRequests && existingRequests.length > 0) {
      return res.status(400).json({
        success: false,
        error: "You already have a pending verification request.",
      });
    }

    // 3. Insert the request
    const { data, error } = await supabase
      .from("creator_verification_requests")
      .insert({
        user_id: userId,
        full_legal_name,
        id_type,
        id_front_url,
        id_back_url,
        selfie_url,
        social_links,
        portfolio_url,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Verification request submitted successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all pending verification requests (Admin only)
 * Now generates signed URLs for private storage access
 */
export async function getPendingRequests(req, res, next) {
  try {
    const { data: requests, error } = await supabase
      .from("creator_verification_requests")
      .select(
        `
        *,
        user:users (
          username,
          email
        )
      `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Generate Signed URLs for each request
    const verificationsWithSignedUrls = await Promise.all(
      requests.map(async (verification) => {
        // Function to extract the path from the full URL
        // It extracts everything after ".../verifications/"
        const getPath = (url) => {
          if (!url) return null;
          const parts = url.split("/verifications/");
          return parts.length > 1 ? parts[1] : url;
        };

        const frontPath = getPath(verification.id_front_url);
        const selfiePath = getPath(verification.selfie_url);
        const backPath = verification.id_back_url
          ? getPath(verification.id_back_url)
          : null;

        // Generate the temporary links (valid for 60 minutes)
        const { data: frontData } = await supabase.storage
          .from("verifications")
          .createSignedUrl(frontPath, 3600);

        const { data: selfieData } = await supabase.storage
          .from("verifications")
          .createSignedUrl(selfiePath, 3600);

        let signedBackUrl = null;
        if (backPath) {
          const { data: backData } = await supabase.storage
            .from("verifications")
            .createSignedUrl(backPath, 3600);
          signedBackUrl = backData?.signedUrl;
        }

        return {
          ...verification,
          id_front_url: frontData?.signedUrl || verification.id_front_url,
          id_back_url: signedBackUrl || verification.id_back_url,
          selfie_url: selfieData?.signedUrl || verification.selfie_url,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: verificationsWithSignedUrls,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update verification request status (Admin only)
 */
export async function updateRequestStatus(req, res, next) {
  try {
    const params = req.validatedParams || req.params;
    const { id } = params;
    const { status, admin_notes } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be 'verified' or 'rejected'.",
      });
    }

    // 1. Update the request
    const { data: request, error: updateError } = await supabase
      .from("creator_verification_requests")
      .update({
        status,
        admin_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Verification request not found.",
      });
    }

    // 2. If verified, the trigger `tr_on_verification_approval` (defined in SQL)
    // will automatically update the `creators` table status.

    res.status(200).json({
      success: true,
      message: `Verification request ${status}`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user's verification status
 */
export async function getVerificationStatus(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("creator_verification_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data || null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 *  Get creator stats
 */
export async function getCreatorStats(req, res, next) {
  try {
    const userId = req.user.id;
    // ... logic ...
    const cacheKey = `creator_stats:${userId}`;
    logger.debug(`[getCreatorStats] userId=${userId} cacheKey=${cacheKey}`);

    const stats = await getOrSet(
      cacheKey,
      async () => {
        logger.debug(
          `[getCreatorStats] Cache miss -> fetching from Supabase for ${userId}`,
        );

        // 1. Get creator basic details and wallet balance
        const { data: creator, error: creatorError } = await supabase
          .from("creators")
          .select("user_id, wallet_balance")
          .eq("user_id", userId)
          .single();

        if (creatorError) {
          if (creatorError.code === "PGRST116") {
            const err = new Error("Creator not found");
            err.code = "CREATOR_NOT_FOUND";
            throw err;
          }

          logger.error("Error fetching creator for stats:", creatorError);
          throw creatorError;
        }

        if (!creator) {
          const err = new Error("Creator not found");
          err.code = "CREATOR_NOT_FOUND";
          throw err;
        }

        // 2. Calculate pending payouts (pending + processing status)
        const { data: payouts, error: payoutsError } = await supabase
          .from("payouts")
          .select("amount")
          .eq("creator_id", creator.user_id)
          .in("status", ["pending", "processing"]);

        if (payoutsError) {
          logger.error("Error fetching payouts:", payoutsError);
          throw payoutsError;
        }

        const pendingPayoutTotal = payouts.reduce(
          (sum, p) => sum + parseFloat(p.amount),
          0,
        );

        const result = {
          wallet_balance: parseFloat(creator.wallet_balance || 0),
          pending_payout: pendingPayoutTotal,
          currency: "USD",
        };

        logger.debug(
          `[getCreatorStats] Supabase fetch success, will cache key: ${cacheKey}`,
        );
        return result;
      },
      60, // 1 minute TTL for financial data (shorter than profile)
    );

    logger.debug(`[getCreatorStats] Returning stats for userId=${userId}`);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get creator profile
 */
export async function getCreatorProfile(req, res) {
  try {
  } catch (error) {}
}

/**
 * Update creator profile
 */
export async function updateCreatorProfile(req, res) {
  try {
  } catch (error) {}
}

/**
 * Delete creator profile
 */
export async function deleteCreatorProfile(req, res) {
  try {
  } catch (error) {}
}
