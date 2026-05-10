import supabase from "../config/db.js";
import { logger } from "../config/logger.js";
import { invalidatePattern } from "../config/redis.js";

const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    currency: "USD",
    features: ["Publish 1 service", "Access to core features"],
    publishLimit: 1,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 12,
    currency: "USD",
    features: ["Unlimited services", "Priority support", "Creator insights"],
    publishLimit: null,
  },
};

export async function getSubscriptionPlans(_req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: Object.values(SUBSCRIPTION_PLANS),
    });
  } catch (error) {
    next(error);
  }
}

export async function getMySubscription(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("creators")
      .select("subscription_plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Creator profile not found.",
      });
    }

    const planId = data.subscription_plan || "free";
    const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.free;

    res.status(200).json({
      success: true,
      data: {
        plan: planId,
        details: plan,
      },
    });
  } catch (error) {
    logger.error("Error fetching subscription:", error);
    next(error);
  }
}

export async function updateSubscriptionPlan(req, res, next) {
  try {
    const userId = req.user.id;
    const { plan } = req.body;

    const normalizedPlan = plan?.toLowerCase();
    if (!SUBSCRIPTION_PLANS[normalizedPlan]) {
      return res.status(400).json({
        success: false,
        error: "Invalid plan. Must be 'free' or 'pro'.",
      });
    }

    const { data, error } = await supabase
      .from("creators")
      .update({ subscription_plan: normalizedPlan })
      .eq("user_id", userId)
      .select("subscription_plan")
      .single();

    if (error) throw error;

    // If upgraded to Pro, record the purchase for financial tracking
    if (normalizedPlan === "pro") {
      try {
        const planDetails = SUBSCRIPTION_PLANS.pro;
        await supabase.from("purchases").insert({
          user_id: userId,
          service_id: null, // Indicates a platform-direct purchase (subscription)
          amount: planDetails.priceMonthly,
          status: "completed",
        });

        // Invalidate admin finance cache
        await invalidatePattern("admin:finance:*");
      } catch (purchaseErr) {
        logger.error("Failed to record subscription purchase:", purchaseErr);
        // Non-fatal, subscription was updated
      }
    }

    await invalidatePattern(`profile:${userId}`);

    res.status(200).json({
      success: true,
      message: `Subscription updated to ${normalizedPlan}.`,
      data: {
        plan: data.subscription_plan,
        details: SUBSCRIPTION_PLANS[data.subscription_plan],
      },
    });
  } catch (error) {
    logger.error("Error updating subscription:", error);
    next(error);
  }
}

export async function cancelSubscription(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("creators")
      .update({ subscription_plan: "free" })
      .eq("user_id", userId)
      .select("subscription_plan")
      .single();

    if (error) throw error;

    await invalidatePattern(`profile:${userId}`);

    res.status(200).json({
      success: true,
      message: "Subscription downgraded to free.",
      data: {
        plan: data.subscription_plan,
        details: SUBSCRIPTION_PLANS[data.subscription_plan],
      },
    });
  } catch (error) {
    logger.error("Error cancelling subscription:", error);
    next(error);
  }
}

export { SUBSCRIPTION_PLANS };
