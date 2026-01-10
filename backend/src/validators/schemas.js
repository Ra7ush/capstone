import { z } from "zod";

// ============ Common Schemas ============

// UUID validation for route params
export const uuidSchema = z
  .string()
  .check(z.uuid({ message: "Invalid ID format" }));

export const idParamSchema = z.object({
  id: uuidSchema,
});

// ============ Auth Schemas ============

export const loginSchema = z.object({
  email: z.email({ message: "Invalid email format" }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .max(128, { message: "Password too long" }),
});

// ============ User Schemas ============

export const updateUserSchema = z.object({
  status: z
    .enum(["active", "suspended", "banned", "reviewing"], {
      errorMap: () => ({
        message: "Status must be: active, suspended, banned, or reviewing",
      }),
    })
    .optional(),
  verification_status: z
    .enum(["pending", "verified", "rejected"], {
      errorMap: () => ({
        message: "Verification status must be: pending, verified, or rejected",
      }),
    })
    .optional(),
});

// ============ Moderation Schemas ============

export const updateModerationSchema = z.object({
  status: z
    .enum(["pending", "reviewing", "resolved", "dismissed"], {
      errorMap: () => ({ message: "Invalid status value" }),
    })
    .optional(),
  admin_notes: z
    .string()
    .max(1000, "Admin notes too long (max 1000 characters)")
    .optional(),
  action: z
    .enum(["suspend", "ban", "warn", "dismiss"], {
      errorMap: () => ({
        message: "Action must be: suspend, ban, warn, or dismiss",
      }),
    })
    .optional(),
});

// ============ Dashboard Schemas ============

export const dashboardQuerySchema = z.object({
  range: z
    .enum(["1W", "1M", "3M", "6M", "1Y", "ALL"], {
      errorMap: () => ({
        message: "Range must be: 1W, 1M, 3M, 6M, 1Y, or ALL",
      }),
    })
    .optional()
    .default("1Y"),
});

// ============ Validation Helper ============

/**
 * Validates data against a schema and returns result
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {{ success: boolean, data?: any, error?: object }}
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    // Format errors for Zod 4 compatibility
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    return {
      success: false,
      error: {
        message: "Validation failed",
        details: issues,
      },
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Express middleware factory for request validation
 * @param {object} schemas - Object with body, params, query schemas
 * @returns {function} Express middleware
 */
export function validateRequest(schemas = {}) {
  return (req, res, next) => {
    const errors = {};

    if (schemas.body) {
      const result = validate(schemas.body, req.body);
      if (!result.success) errors.body = result.error;
      else req.body = result.data;
    }

    if (schemas.params) {
      const result = validate(schemas.params, req.params);
      if (!result.success) errors.params = result.error;
      // Note: req.params is read-only in Express 5, use req.validatedParams instead
      else req.validatedParams = result.data;
    }

    if (schemas.query) {
      const result = validate(schemas.query, req.query);
      if (!result.success) errors.query = result.error;
      // Note: req.query is read-only in Express 5, use req.validatedQuery instead
      else req.validatedQuery = result.data;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors,
      });
    }

    next();
  };
}
