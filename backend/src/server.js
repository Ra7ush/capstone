import express from "express";
import path from "path";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ENV } from "./config/env.js";
import adminRouter from "./routes/admin.route.js";
import creatorRouter from "./routes/creator.route.js";

const __dirname = path.resolve();

const app = express();

// ============ Security Middleware ============

// Security headers (XSS protection, CSP, etc.)
app.use(helmet());

// Rate limiting - general API protection
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
  })
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

// Creator routes
app.use("/api/creator", creatorRouter);

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

// ============ Start Server ============

app.listen(ENV.PORT, () => {
  console.log(`Server running at http://localhost:${ENV.PORT}`);
  console.log(`Environment: ${ENV.NODE_ENV || "development"}`);
});
