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
  aal?: "aal1" | "aal2"; // Authenticator Assurance Level
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
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  profile_image_url: string | null;
  avatar_url?: string | null; // Alias used in community features
  followers_count: number;
  following_count: number;
  mfa_enabled?: boolean;
  // Flattened profile fields
  cover_image_url?: string | null;
  bio?: string | null;
  category?: string | null;
  verification_status?: VerificationStatus;
  created_at: string;
  updated_at: string;
}

// ============================================
// Creator Types
// ============================================

export type VerificationStatus = "none" | "pending" | "verified" | "rejected";

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
// Service/Course Types
// ============================================

export type ServiceType = "course"; // Fixed to course only for now
export type ServiceStatus = "draft" | "published";

export interface Service {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: string | null;
  type: ServiceType;
  price: number | null;
  thumbnail_url: string | null;
  status: ServiceStatus;
  created_at: string;
  modules_count?: number;
  creator?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  modules?: CourseModule[];
  resources?: CourseResource[];
}

export interface CourseModule {
  id: string;
  service_id: string;
  title: string;
  order_index: number;
  created_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_duration: number | null;
  order_index: number;
  is_preview: boolean;
  created_at: string;
}

export interface CourseResource {
  id: string;
  service_id: string;
  lesson_id: string | null;
  title: string;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  service_id: string;
  amount: number | null;
  status: string;
  purchased_at: string;
}

export interface CourseProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  last_watched_position: number | null;
  completed_at: string | null;
}

// Create/Update DTOs
export interface CreateServiceData {
  title: string;
  description?: string;
  category?: string;
  price?: number;
  thumbnail_url?: string;
}

export interface CreateModuleData {
  title: string;
}

export interface CreateLessonData {
  title: string;
  description?: string;
  video_url?: string;
  video_duration?: number;
  is_preview?: boolean;
}

export interface CreateResourceData {
  title: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  lesson_id?: string;
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
  product: Service; // Changed from Product to Service
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
