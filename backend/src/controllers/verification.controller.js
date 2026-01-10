import supabase from "../config/db.js";

/**
 * Handle creator verification submission
 */
export async function submitVerification(req, res) {
  try {
    const userId = req.user.id;
    const { full_legal_name, id_type, id_front_url, id_back_url, selfie_url } =
      req.body;

    // 1. Basic validation
    if (!full_legal_name || !id_type || !id_front_url || !selfie_url) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields (Legal Name, ID Type, ID Front, Selfie)",
      });
    }

    // 2. Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from("creator_verification_requests")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
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
    console.error("Submit verification error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An internal error occurred",
    });
  }
}

/**
 * Get all pending verification requests (Admin only)
 * Now generates signed URLs for private storage access
 */
export async function getPendingRequests(req, res) {
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
      `
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
      })
    );

    res.status(200).json({
      success: true,
      data: verificationsWithSignedUrls,
    });
  } catch (error) {
    console.error("Get pending verifications error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An internal error occurred",
    });
  }
}

/**
 * Update verification request status (Admin only)
 */
export async function updateRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be 'approved' or 'rejected'.",
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

    // 2. If approved, the trigger `tr_on_verification_approval` (defined in SQL)
    // will automatically update the `creators` table status.

    res.status(200).json({
      success: true,
      message: `Verification request ${status}`,
      data: request,
    });
  } catch (error) {
    console.error("Update verification status error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An internal error occurred",
    });
  }
}
