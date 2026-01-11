// ============================================
// Auth Types
// ============================================

export type AuthState = {
  isLoading: boolean;
  session: any | null;
  isEmailVerified: boolean;
  hasProfile: boolean;
  pendingEmail: string | null;
  user: any | null;
};

// ============================================
// User Types
// ============================================

export type UserRole = "user" | "creator" | "admin";
export type UserStatus = "active" | "suspended" | "banned";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Creator Types
// ============================================

export type VerificationStatus = "none" | "pending" | "approved" | "rejected";

export interface Creator {
  id: string;
  user_id: string;
  bio: string | null;
  social_links: SocialLinks | null;
  portfolio_url: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
}

// ============================================
// Verification Types
// ============================================

export type IdType = "national_id" | "passport" | "drivers_license";

export interface VerificationRequest {
  id: string;
  creator_id: string;
  full_legal_name: string;
  id_type: IdType;
  id_front_url: string;
  id_back_url: string | null;
  selfie_url: string;
  status: VerificationStatus;
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface VerificationSubmission {
  fullLegalName: string;
  idType: IdType;
  socialLinks: SocialLinks;
  portfolioUrl: string;
  idFrontBase64: string;
  idBackBase64?: string;
  selfieBase64: string;
}

// ============================================
// Product Types (for future use)
// ============================================

export interface Product {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
}

// ============================================
// Order Types (for future use)
// ============================================

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_price: number;
  status: OrderStatus;
  shipping_address: Address;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  product: Product;
  quantity: number;
  price: number;
}

export interface Address {
  full_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  phone_number: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  data: VerificationRequest;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
