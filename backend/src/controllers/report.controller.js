import supabase from "../config/db.js";
import { logger } from "../config/logger.js";

/**
 * Submit a moderation report against a user
 */
export async function submitReport(req, res, next) {
  try {
    const reporterId = req.user.id;
    const {
      reported_user_id,
      content_type,
      content_reference_id,
      reason,
      description,
    } = req.body;

    if (!reported_user_id || !content_type || !reason) {
      return res.status(400).json({
        success: false,
        error: "reported_user_id, content_type, and reason are required.",
      });
    }

    if (reported_user_id === reporterId) {
      return res.status(400).json({
        success: false,
        error: "You cannot report yourself.",
      });
    }

    // Check for duplicate recent report (same reporter + reported + reason within 24h)
    const { data: existing } = await supabase
      .from("moderation_reports")
      .select("id")
      .eq("reporter_id", reporterId)
      .eq("reported_user_id", reported_user_id)
      .eq("reason", reason)
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error:
          "You have already submitted a similar report recently. Please wait before reporting again.",
      });
    }

    // Map "user" to "profile" to match database constraint
    const finalContentType = content_type === "user" ? "profile" : content_type;

    const { data, error } = await supabase
      .from("moderation_reports")
      .insert({
        reporter_id: reporterId,
        reported_user_id,
        content_type: finalContentType,
        content_reference_id: content_reference_id || null,
        reason,
        description: description || null,
        status: "pending",
        priority: "medium",
      })
      .select("id, report_number, status, created_at")
      .single();

    if (error) {
      logger.error("Error creating report:", error);
      throw error;
    }

    logger.info(
      `[submitReport] Report #${data.report_number} created by ${reporterId} against ${reported_user_id} for ${reason}`,
    );

    return res.status(201).json({
      success: true,
      message:
        "Report submitted successfully. Our team will review it shortly.",
      data,
    });
  } catch (error) {
    next(error);
  }
}
