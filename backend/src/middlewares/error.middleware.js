import { ENV } from "../config/env.js";
import { logger } from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  logger.error(err.message, {
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: err.message || "Server Error",
    code: err.code || "INTERNAL_SERVER_ERROR",
    stack: ENV.NODE_ENV === "production" ? null : err.stack,
  });
};
