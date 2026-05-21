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

    // 4. Mark creator as pending so UI shows "Under Review"
    const { error: statusError } = await supabase
      .from("creators")
      .update({ verification_status: "pending", verified_at: null })
      .eq("user_id", userId);

    if (statusError) {
      logger.error(
        "Failed to update creator verification status:",
        statusError,
      );
    }

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

    // 2. Explicitly update the creators table verification status
    const { error: creatorUpdateError } = await supabase
      .from("creators")
      .update({ 
         verification_status: status,
         ...(status === "verified" ? { verified_at: new Date().toISOString() } : {})
      })
      .eq("user_id", request.user_id);
      
    if (creatorUpdateError) {
      console.error("Failed to update creator status:", creatorUpdateError);
    }

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

        // 1. Get creator basic details, wallet balance, and rating
        const { data: creator, error: creatorError } = await supabase
          .from("creators")
          .select(
            "user_id, wallet_balance, total_earnings, average_rating, total_ratings",
          )
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

        // 3. Get followers count
        const { count: followersCount, error: followersError } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId);

        if (followersError) {
          logger.warn("Error fetching followers count:", followersError);
        }

        // 4. Calculate monthly revenue (Total earned/pending from sales this month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: monthlyPayouts, error: monthlyError } = await supabase
          .from("payouts")
          .select("amount")
          .eq("creator_id", creator.user_id)
          .in("status", ["pending", "processing", "paid", "completed"])
          .gte("created_at", startOfMonth.toISOString());

        let monthlyRevenue = 0;
        if (!monthlyError && monthlyPayouts) {
          monthlyRevenue = monthlyPayouts.reduce(
            (sum, p) => sum + parseFloat(p.amount),
            0,
          );
        }

        const result = {
          wallet_balance: parseFloat(creator.wallet_balance || 0),
          pending_payout: pendingPayoutTotal,
          followers_count: followersCount || 0,
          monthly_revenue: monthlyRevenue,
          total_earnings: parseFloat(creator.total_earnings || 0),
          average_rating: parseFloat(creator.average_rating || 0),
          total_ratings: creator.total_ratings || 0,
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
export async function getCreatorProfile(req, res, next) {
  try {
    const { id } = req.params;
    const cacheKey = `creator_profile:${id}`;

    const data = await getOrSet(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("creators")
          .select(
            `
            *,
            user:users (
              username,
              full_name,
              profile_image_url,
              role
            )
          `,
          )
          .eq("user_id", id)
          .single();

        if (error) {
          if (error.code === "PGRST116") return null;
          throw error;
        }
        return data;
      },
      3600,
    );

    if (!data) {
      return res
        .status(404)
        .json({ success: false, error: "Creator not found" });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * Update creator profile
 */
export async function updateCreatorProfile(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { bio, social_links, portfolio_url } = req.body;

    if (id !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const updates = {};
    if (bio !== undefined) updates.bio = bio;
    if (social_links !== undefined) updates.social_links = social_links;
    if (portfolio_url !== undefined) updates.portfolio_url = portfolio_url;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("creators")
      .update(updates)
      .eq("user_id", id)
      .select()
      .single();

    if (error) throw error;

    // Invalidate caches
    await invalidatePattern(`creator_profile:${id}`);
    await invalidatePattern(`profile:${id}`);

    res.status(200).json({
      success: true,
      message: "Creator profile updated successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete creator profile
 */
export async function deleteCreatorProfile(req, res) {
  try {
  } catch (error) {}
}

/**
 * Get recent activity for a creator (new followers, comments on posts)
 */
export async function getRecentActivity(req, res, next) {
  try {
    const userId = req.user.id;
    const cacheKey = `creator_activity:${userId}`;

    const activity = await getOrSet(
      cacheKey,
      async () => {
        const activities = [];

        // 1. Get recent followers (people who followed this creator)
        const { data: followers, error: followersError } = await supabase
          .from("follows")
          .select(
            `
            id,
            created_at,
            follower:users!follows_follower_id_fkey (
              id,
              username,
              full_name,
              profile_image_url
            )
          `,
          )
          .eq("following_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!followersError && followers) {
          for (const f of followers) {
            activities.push({
              id: `follow_${f.id}`,
              type: "follow",
              message: `${f.follower?.full_name || f.follower?.username || "Someone"} started following you`,
              user: f.follower,
              created_at: f.created_at,
            });
          }
        }

        // 2. Get recent comments on creator's posts
        const { data: comments, error: commentsError } = await supabase
          .from("comments")
          .select(
            `
            id,
            content,
            created_at,
            user:users!post_comments_user_id_fkey (
              id,
              username,
              full_name,
              profile_image_url
            ),
            post:posts!post_comments_post_id_fkey (
              id,
              user_id
            )
          `,
          )
          .eq("post.user_id", userId)
          .neq("user_id", userId) // Exclude self-comments
          .order("created_at", { ascending: false })
          .limit(10);

        if (!commentsError && comments) {
          for (const c of comments) {
            if (c.post) {
              // Filter valid comments
              activities.push({
                id: `comment_${c.id}`,
                type: "comment",
                message: `${c.user?.full_name || c.user?.username || "Someone"} commented on your post`,
                user: c.user,
                created_at: c.created_at,
              });
            }
          }
        }

        // 3. Get recent post likes
        const { data: likes, error: likesError } = await supabase
          .from("post_likes")
          .select(
            `
            id,
            created_at,
            user:users!post_likes_user_id_fkey (
              id,
              username,
              full_name,
              profile_image_url
            ),
            post:posts!post_likes_post_id_fkey (
              id,
              user_id
            )
          `,
          )
          .eq("post.user_id", userId)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!likesError && likes) {
          for (const l of likes) {
            if (l.post) {
              activities.push({
                id: `like_${l.id}`,
                type: "like",
                message: `${l.user?.full_name || l.user?.username || "Someone"} liked your post`,
                user: l.user,
                created_at: l.created_at,
              });
            }
          }
        }

        // Sort all activities by date and return top 10
        activities.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );

        return activities.slice(0, 10);
      },
      30, // 30 second TTL for activity feed
    );

    res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Withdraw funds (Simulated)
 */
export async function withdrawFunds(req, res, next) {
  try {
    const userId = req.user.id;

    // 1. Get current balance
    const { data: creator, error: fetchError } = await supabase
      .from("creators")
      .select("wallet_balance")
      .eq("user_id", userId)
      .single();

    if (fetchError || !creator) {
      return res.status(404).json({ success: false, error: "Creator not found" });
    }

    const amount = parseFloat(creator.wallet_balance || 0);

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: "No funds available to withdraw" });
    }

    // 2. Reset balance
    const { error: updateError } = await supabase
      .from("creators")
      .update({ wallet_balance: 0 })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    // 3. Clear cache
    await invalidatePattern(`creator_stats:${userId}`);

    res.status(200).json({
      success: true,
      message: `Successfully withdrawn $${amount.toFixed(2)}`,
      withdrawnAmount: amount,
    });
  } catch (error) {
    next(error);
  }
}
