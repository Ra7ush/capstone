import supabase from "../config/db.js";
import { ENV } from "../config/env.js";

/**
 * Middleware to authenticate and authorize admin users.
 * Validates the JWT token from the Authorization header and ensures
 * the user's email matches the configured ADMIN_EMAIL.
 */
export async function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: No valid authentication token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify the JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired token.",
      });
    }

    // STRICT ADMIN CHECK: Verify user email matches admin email
    if (user.email?.toLowerCase() !== ENV.ADMIN_EMAIL?.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error:
          "Forbidden: You do not have permission to access the admin portal.",
      });
    }

    // Attach user to request for downstream use
    req.user = user;
    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during authentication.",
    });
  }
}
