import supabase from "../config/db.js";
import { ENV } from "../config/env.js";
import os from "os";

export async function verifyAdmin(req, res) {
  try {
    // If the request reaches here, it has passed through adminAuth middleware
    res.status(200).json({
      success: true,
      message: "Admin verified successfully",
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role || "admin",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "An internal error occurred",
    });
  }
}

export async function getSystemHealth(req, res) {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // CPU Load (Mocking realistic load based on averages)
    // os.loadavg() gives 1, 5, 15 min averages. We take 1 min and normalize.
    const loadAvg = os.loadavg()[0];
    const cpuCount = cpus.length;
    // Normalize to 0-100 range. Ideally load can be > cpuCount, but for UI we cap or scale.
    // Simple heuristic: (load / cpuCount) * 100
    const cpuUsage = Math.min(Math.round((loadAvg / cpuCount) * 100), 100) || 5;

    const memoryUsageGB = (usedMem / 1024 / 1024 / 1024).toFixed(1);
    const totalMemoryGB = (totalMem / 1024 / 1024 / 1024).toFixed(0);

    // Mocked for Demo as standard node doesn't have disk access easily without libs
    const storageUsedPercent = 45;
    const errorRate = 0.05;

    res.status(200).json({
      success: true,
      data: {
        cpu: {
          usage: cpuUsage,
          status: cpuUsage > 80 ? "HEAVY" : "HEALTHY",
        },
        memory: {
          used: memoryUsageGB,
          total: totalMemoryGB,
          status: usedMem / totalMem > 0.9 ? "HEAVY" : "HEALTHY",
        },
        storage: {
          usedPercent: storageUsedPercent,
          status: "HEALTHY",
        },
        errorRate: {
          value: errorRate,
          status: errorRate > 1 ? "CRITICAL" : "ATTENTION",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching system health:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getDashboardStats(req, res) {
  try {
    // Use validatedQuery if available (from validation middleware), fallback to query
    const query = req.validatedQuery || req.query;
    const { range } = query;
    console.log("getDashboardStats called with range:", range || "1Y");

    const { data, error } = await supabase.rpc("get_dashboard_stats", {
      time_range: range || "1Y",
    });

    console.log("Supabase RPC response - data:", data, "error:", error);

    if (error) {
      console.error(
        "Supabase RPC error details:",
        JSON.stringify(error, null, 2)
      );
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getAllUsers(req, res) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        username,
        role,
        status,
        creators (
          verification_status,
          total_earnings
        )
      `
      )
      .order("updated_at", { ascending: false });

    console.log(data);

    if (error) {
      throw error;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// TODO: we need implement the logig for the suspended users
export async function updateUser(req, res) {
  try {
    const params = req.validatedParams || req.params;
    const { id } = params;
    const { status, verification_status } = req.body;

    const { data, error } = await supabase.rpc(
      "update_user_and_creator_status",
      {
        p_user_id: id,
        p_status: status,
        p_verification_status: verification_status,
      }
    );

    if (error) throw error;

    // --- Hard Ban Protocol (Supabase Auth Synchronization) ---
    if (status) {
      if (status.toLowerCase() === "banned") {
        // 1. Set ban duration (e.g., 100 years) to prevent new sessions
        await supabase.auth.admin.updateUserById(id, {
          ban_duration: "876000h",
        });
        // 2. Immediately invalidate all active sessions
        await supabase.auth.admin.signOut(id);
      } else {
        // Lift ban if status is changed to anything else (Active, Reviewing, etc.)
        await supabase.auth.admin.updateUserById(id, { ban_duration: "none" });
      }
    }
    // -------------------------------------------------------

    // 2. Handle "Not Found" logic
    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "User not found (Check RLS policies)",
      });
    }

    res.status(200).json({ message: "User updated successfully", data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const params = req.validatedParams || req.params;
    const { id } = params;
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) throw error;

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getFinancesStatus(req, res) {
  try {
    const { data, error } = await supabase.rpc("get_financial_stats");
    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getTransactionsHistory(req, res) {
  try {
    const { data, error } = await supabase
      .from("payouts")
      .select(
        `
        id,
        amount,
        status,
        method,
        created_at,
        creators (
          user_id,
          users (
            username,
            email
          )
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const formattedData = data.map((payout) => ({
      id: payout.id,
      creator: payout.creators?.users?.username || "Unknown",
      email: payout.creators?.users?.email || "N/A",
      amount: `$${payout.amount.toFixed(2)}`,
      status: payout.status.charAt(0).toUpperCase() + payout.status.slice(1),
      method: payout.method.charAt(0).toUpperCase() + payout.method.slice(1),
      date: new Date(payout.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));

    console.log(formattedData);
    return res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error fetching history:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function processAllPayouts(req, res) {
  try {
    const { data, error } = await supabase.rpc("process_all_pending_payouts");

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "All payouts processed successfully",
      result: data,
    });
  } catch (error) {
    console.error("Error processing payouts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function processSinglePayout(req, res) {
  try {
    const params = req.validatedParams || req.params;
    const { id } = params;
    const { data, error } = await supabase.rpc("process_single_payout", {
      p_id: id,
    });
    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Payout processed successfully",
      result: data,
    });
  } catch (error) {
    console.error("Error processing payout:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getModerations(req, res) {
  try {
    const { data, error } = await supabase
      .from("moderation_reports")
      .select(
        `
        *,
        reported_user:users!reported_user_id (
          username,
          email,
          status
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Format data to match UI Mockup needs
    const formattedData = data.map((report) => ({
      id: report.id,
      report_number_display: `#RPT-${report.report_number}`,
      type_display: `${
        report.content_type.charAt(0).toUpperCase() +
        report.content_type.slice(1)
      } Report`,
      reason: report.reason,
      content_snippet: report.description || "No description provided.",
      status: report.status.toUpperCase(),
      priority: report.priority,
      reported_user: {
        id: report.reported_user_id,
        name:
          report.reported_user?.name ||
          report.reported_user?.username ||
          "Unknown User",
        email: report.reported_user?.email || "N/A",
        status: report.reported_user?.status || "active",
        avatar_initials: (
          report.reported_user?.name ||
          report.reported_user?.username ||
          "U"
        )
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase(),
      },
      admin_notes: report.admin_notes,
      created_at: report.created_at,
    }));

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error fetching moderations:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateModeration(req, res) {
  try {
    const params = req.validatedParams || req.params;
    const { id } = params;
    const { status, admin_notes, action } = req.body;

    // 1. Fetch Report & User ID
    const { data: report, error: fetchError } = await supabase
      .from("moderation_reports")
      .select("reported_user_id")
      .eq("id", id)
      .single();

    if (fetchError || !report) throw new Error("Report not found");

    const userId = report.reported_user_id;

    // Validate userId is a valid UUID before calling auth admin functions
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValidUUID = userId && uuidRegex.test(userId);

    // 2. Perform Action (if any)
    if (action === "suspend") {
      // Update user status in database
      const { error: updateError } = await supabase
        .from("users")
        .update({ status: "suspended" })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Only call auth admin functions if userId is a valid UUID
      if (isValidUUID) {
        try {
          // 2 Weeks Suspension
          const twoWeeksHours = 24 * 14;
          await supabase.auth.admin.updateUserById(userId, {
            ban_duration: `${twoWeeksHours}h`,
          });
          await supabase.auth.admin.signOut(userId); // Force logout
        } catch (authError) {
          console.warn("Auth admin operation failed:", authError.message);
          // Continue - user status is already updated in database
        }
      }
    } else if (action === "ban") {
      // Update user status in database
      const { error: updateError } = await supabase
        .from("users")
        .update({ status: "banned" })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Only call auth admin functions if userId is a valid UUID
      if (isValidUUID) {
        try {
          // Permanent Ban (100 Years)
          const foreverHours = 24 * 365 * 100;
          await supabase.auth.admin.updateUserById(userId, {
            ban_duration: `${foreverHours}h`,
          });
          await supabase.auth.admin.signOut(userId); // Force logout
        } catch (authError) {
          console.warn("Auth admin operation failed:", authError.message);
          // Continue - user status is already updated in database
        }
      }
    }

    // 3. Update Report Status
    const { data, error } = await supabase
      .from("moderation_reports")
      .update({
        status: "resolved", // Always mark resolved if action taken
        admin_notes,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: `Action '${action || "none"}' executed successfully`,
      result: data,
    });
  } catch (error) {
    console.error("Error updating moderation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteModeration(req, res) {
  try {
    const params = req.validatedParams || req.params;
    const { id } = params;
    const { error } = await supabase
      .from("moderation_reports")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting moderation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
