import express from "express";
import path from "path";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ENV } from "./config/env.js";
import adminRouter from "./routes/admin.route.js";
import creatorRouter from "./routes/creator.route.js";
import communityRouter from "./routes/community.route.js";
import followRouter from "./routes/follow.route.js";
import profileRouter from "./routes/profile.route.js";
import messageRouter from "./routes/message.route.js";
import { redisClient } from "./config/redis.js";
import serviceRouter from "./routes/service.route.js";
import blockRouter from "./routes/block.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { setupRealtimeSync } from "./config/realtimeSync.js";
import { logger } from "./config/logger.js";

const __dirname = path.resolve();

const app = express();
await redisClient.connect();

// Start real-time cache invalidation listener
// setupRealtimeSync();
// Connect to Redis with timeout - don't block server startup
try {
  await Promise.race([
    redisClient.connect(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connection timeout")), 5000),
    ),
  ]);
} catch (err) {
  logger.warn(
    "Redis connection failed, server starting without cache:",
    err.message,
  );
}

// ============ Request Logger ============
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ============ Security Middleware ============

// Security headers (XSS protection, CSP, etc.)
app.use(helmet());

// Rate limiting - general API protection
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (Higher for proactive sync)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many login attempts, please try again later.",
  },
});

// ============ Core Middleware ============

app.use(
  cors({
    origin: ENV.ALLOWED_ORIGINS?.split(",") || "http://localhost:5173",
    credentials: true,
  }),
);

// Limit request body size to prevent DoS
app.use(express.json({ limit: "10kb" }));

// Apply general rate limiting to all routes
app.use(generalLimiter);

// ============ Routes ============

// Apply stricter rate limiting to auth verification endpoint
app.use("/api/admin/verify", authLimiter);

// Admin routes
app.use("/api/admin", adminRouter);

//Community routes
app.use("/api/community", communityRouter);

//Follow routes
app.use("/api/follow", followRouter);

// Profile routes
app.use("/api/profile", profileRouter);

// Message routes
app.use("/api/message", messageRouter);

// Creator routes
app.use("/api/creator", creatorRouter);

//Service routes
app.use("/api/service", serviceRouter);

// Block routes
app.use("/api/block", blockRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// ============ Production Static Serving ============

if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../admin/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../admin", "dist", "index.html"));
  });
}

// ============ Error Handling ============
app.use(errorHandler);

// ============ Start Server ============

const server = app.listen(ENV.PORT, "0.0.0.0", () => {
  logger.info(`Server running at http://0.0.0.0:${ENV.PORT}`);
  logger.info(`Environment: ${ENV.NODE_ENV || "development"}`);
  logger.info(
    `Redis connected: ${redisClient.status === "ready" ? "true" : "false"}`,
  );
});

async function gracefulShutdown(signal) {
  try {
    logger.info(`${signal} received. Shutting down gracefully...`);
    await redisClient.quit().catch((e) => {
      logger.error("Error quitting Redis:", e);
    });
    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });
  } catch (err) {
    logger.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
