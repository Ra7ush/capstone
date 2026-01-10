import supabase from "../config/db.js";

/**
 * Middleware to authenticate any logged-in user.
 * Validates the JWT token from the Authorization header.
 */
export async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: No valid authentication token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify the JWT token with Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired token.",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during authentication.",
    });
  }
}
