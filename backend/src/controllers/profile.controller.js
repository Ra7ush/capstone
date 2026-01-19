import supabase from "../config/db.js";

export async function getProfile(req, res) {
  try {
    const { id } = req.params;
    console.log("GET /api/profile", id);

    const { data, error } = await supabase
      .from("users")
      .select("*, creators(*)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase error in getProfile:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data) {
      return res
        .status(404)
        .json({ success: false, error: "Profile not found" });
    }

    // Flatten logic for cleaner frontend consumption
    if (data.creators) {
      data.bio = data.creators.bio;
      data.verification_status = data.creators.verification_status;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Exception in getProfile:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const { id } = req.params;
    const { full_name, username, bio } = req.body;
    const authenticatedUserId = req.user?.id;

    console.log("PUT /api/profile", {
      id,
      full_name,
      username,
      bio,
      authenticatedUserId,
    });

    // Security check: confirm the user is updating themselves
    if (id !== authenticatedUserId) {
      console.warn("Unauthorized update attempt:", { id, authenticatedUserId });
      return res
        .status(403)
        .json({ success: false, error: "Unauthorized update" });
    }

    // 1. Update core user table
    const userUpdates = {};
    if (full_name !== undefined) userUpdates.full_name = full_name;
    if (username !== undefined) userUpdates.username = username;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabase
        .from("users")
        .update(userUpdates)
        .eq("id", id);

      if (userError) {
        console.error("Supabase error updating user:", userError);
        throw userError;
      }
    }

    // 2. Update creator bio if it exists
    if (bio !== undefined) {
      const { error: creatorError } = await supabase
        .from("creators")
        .update({ bio })
        .eq("user_id", id);

      if (creatorError) {
        console.error("Supabase error updating creator bio:", creatorError);
        throw creatorError;
      }
    }

    return res
      .status(200)
      .json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Exception in updateProfile:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteProfile(req, res) {
  try {
    const { id } = req.params;
    const authenticatedUserId = req.user?.id;

    if (id !== authenticatedUserId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: "Profile deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getNotifications(req, res) {
  try {
    return res.status(200).json({ success: true, data: [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function markNotificationAsRead(req, res) {
  try {
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
export async function searchProfiles(req, res) {
  try {
    const { q } = req.query;
    console.log("GET /api/profile/search", q);

    if (!q || q.length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const normalizedQ = q.startsWith("@") ? q.substring(1) : q;
    const escapedQ = normalizedQ.replace(/[%_\\]/g, "\\$&");
    console.log(
      `[Search] Original: "${q}", Normalized: "${normalizedQ}", Current User: ${req.user.id}`,
    );

    const { data, error } = await supabase
      .from("users")
      .select("id, username, full_name, role, profile_image_url")
      .or(`username.ilike.*${escapedQ}*,full_name.ilike.*${escapedQ}*`)
      .neq("id", req.user.id) // Don't include self
      .limit(10);

    console.log(`[Search] Found ${data?.length || 0} users for "${escapedQ}"`);
    if (data)
      console.log(`[Search] Result IDs: ${data.map((u) => u.id).join(", ")}`);
    if (error) {
      console.error("Supabase error in searchProfiles:", error);
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Exception in searchProfiles:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
