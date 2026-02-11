import supabase from "../config/db.js";
import { logger } from "../config/logger.js";
import { createNotification } from "./notification.controller.js";

export async function createPurchase(req, res, next) {
  try {
    const { service_id } = req.body;
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!service_id) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }
    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user_id)
      .eq("service_id", service_id)
      .maybeSingle();
    if (existingPurchase) {
      return res
        .status(400)
        .json({ success: false, error: "Service already purchased" });
    }
    // Fetch the service to get the real price server-side
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("price, creator_id, title, status")
      .eq("id", service_id)
      .single();
    if (serviceError || !service) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }
    if (service.status !== "published") {
      return res
        .status(400)
        .json({ success: false, error: "Service not available" });
    }
    // Use server-side price — never trust client-supplied amount
    const verifiedAmount = service.price || 0;
    const { data, error } = await supabase
      .from("purchases")
      .insert({
        user_id,
        service_id,
        amount: verifiedAmount,
        status: "completed",
      })
      .select()
      .single();
    if (error) {
      throw error;
    }

    // Notify the service creator about the purchase
    try {
      const { data: buyer } = await supabase
        .from("users")
        .select("username")
        .eq("id", user_id)
        .single();

      if (service.creator_id) {
        await createNotification({
          userId: service.creator_id,
          actorId: user_id,
          type: "purchase",
          title: `${buyer?.username || "Someone"} purchased ${service.title}`,
          body: `Amount: $${verifiedAmount}`,
          data: { service_id, purchase_id: data.id, amount: verifiedAmount },
        });
      }
    } catch (notifErr) {
      logger.error("Purchase notification error:", notifErr);
      // Non-fatal — purchase was successful
    }

    return res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getPurchases(req, res, next) {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("purchases")
      .select("*, service:services(*)")
      .eq("user_id", user_id)
      .order("purchased_at", { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
