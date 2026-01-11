/**
 * App Constants
 *
 * Centralized location for all app-wide constants.
 */

// App Info
export const APP_NAME = "NexusHub";
export const APP_VERSION = "1.0.0";

// Storage Keys
export const STORAGE_KEYS = {
  PENDING_EMAIL: "@pending_verification_email",
  ONBOARDING_COMPLETED: "@onboarding_completed",
  THEME: "@theme_preference",
} as const;

// Avatar Options
export const AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/png?seed=1",
  "https://api.dicebear.com/7.x/avataaars/png?seed=2",
  "https://api.dicebear.com/7.x/avataaars/png?seed=3",
  "https://api.dicebear.com/7.x/avataaars/png?seed=4",
  "https://api.dicebear.com/7.x/avataaars/png?seed=5",
  "https://api.dicebear.com/7.x/avataaars/png?seed=6",
] as const;

// ID Types for Verification
export const ID_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
] as const;

// User Roles
export const USER_ROLES = {
  USER: "user",
  CREATOR: "creator",
  ADMIN: "admin",
} as const;

// Verification Statuses
export const VERIFICATION_STATUS = {
  NONE: "none",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

// Order Statuses
export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

// API Endpoints (relative paths)
export const API_ENDPOINTS = {
  // Auth
  VERIFY: "/api/creator/verify",

  // Users
  USERS: "/api/users",
  USER_PROFILE: "/api/users/profile",

  // Creators
  CREATORS: "/api/creators",

  // Products
  PRODUCTS: "/api/products",

  // Orders
  ORDERS: "/api/orders",
} as const;

// Validation
export const VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  PASSWORD_MIN_LENGTH: 8,
  BIO_MAX_LENGTH: 500,
  OTP_LENGTH: 6,
} as const;

// Colors (matching Tailwind config)
export const COLORS = {
  primary: "#000000",
  secondary: "#F3F4F6",
  accent: "#FF4D00",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
} as const;

// Social Link Platforms
export const SOCIAL_PLATFORMS = [
  {
    key: "github",
    label: "GitHub",
    icon: "logo-github",
    placeholder: "github.com/username",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "logo-linkedin",
    placeholder: "linkedin.com/in/username",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "logo-instagram",
    placeholder: "instagram.com/username",
  },
  {
    key: "twitter",
    label: "Twitter/X",
    icon: "logo-twitter",
    placeholder: "twitter.com/username",
  },
] as const;

// Query Keys (for React Query)
export const QUERY_KEYS = {
  USER: ["user"],
  CREATOR: ["creator"],
  PRODUCTS: ["products"],
  ORDERS: ["orders"],
  VERIFICATION: ["verification"],
} as const;
