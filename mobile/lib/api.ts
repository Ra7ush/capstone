import axios from "axios";
import { supabase } from "./supabase";
import type {
  MyServicesResponse,
  CreateServiceResponse,
  NotificationsResponse,
  UnreadCountResponse,
} from "@/types";

/**
 * Axios instance with Supabase auth token interceptor
 */
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Cache the session promise to avoid multiple concurrent getSession calls
let sessionPromise: Promise<string | null> | null = null;
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

const getAuthToken = async (): Promise<string | null> => {
  // Return cached token if still valid (with 30 second buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 30000) {
    return cachedToken;
  }

  // If already fetching, return the existing promise
  if (sessionPromise) {
    return sessionPromise;
  }

  // Fetch new session
  sessionPromise = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      cachedToken = data.session?.access_token || null;
      // Cache for 5 minutes or until expiry (whichever is sooner)
      tokenExpiresAt = data.session?.expires_at
        ? data.session.expires_at * 1000
        : Date.now() + 5 * 60 * 1000;
      return cachedToken;
    } finally {
      sessionPromise = null;
    }
  })();

  return sessionPromise;
};

// Listen for auth state changes to update cached token
supabase.auth.onAuthStateChange((event, session) => {
  cachedToken = session?.access_token || null;
  tokenExpiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// API Endpoints (kept for backward compatibility)
// Prefer using hooks instead of these directly
// ============================================

export const creatorApi = {
  submitVerification: async (data: any) => {
    const response = await api.post("/api/creator/verify", data);
    return response.data;
  },
  getStatus: async () => {
    const response = await api.get("/api/creator/verification-status");
    return response.data;
  },
  getStats: async (userId: string) => {
    const response = await api.get(`/api/creator/stats/${userId}`);
    return response.data.data;
  },
  getProfile: async (userId: string) => {
    const response = await api.get(`/api/creator/profile/${userId}`);
    return response.data.data;
  },
  updateProfile: async (userId: string, data: any) => {
    const response = await api.put(`/api/creator/profile/${userId}`, data);
    return response.data.data;
  },
  getRecentActivity: async () => {
    const response = await api.get("/api/creator/activity");
    return response.data.data;
  },
};

export const communityApi = {
  getFeed: async ({
    page = 1,
    limit = 10,
    community_id,
  }: {
    page?: number;
    limit?: number;
    community_id?: string | null;
  } = {}) => {
    const response = await api.get("/api/community/posts/feed", {
      params: { page, limit, community_id },
    });
    return response.data;
  },
  createPost: async (postData: {
    content: string;
    images?: string[];
    community_id?: string | null;
  }) => {
    const response = await api.post("/api/community/posts", postData);
    return response.data;
  },
  // Community Management
  createCommunity: async (communityData: {
    name: string;
    description?: string;
    banner_url?: string;
    privacy?: "public" | "private";
    category?: string;
  }) => {
    const response = await api.post("/api/community", communityData);
    return response.data;
  },
  getDiscoverCommunities: async (params?: {
    category?: string;
    search?: string;
  }) => {
    const response = await api.get("/api/community/discover", {
      params,
    });
    return response.data;
  },
  getCommunityById: async (id: string) => {
    const response = await api.get(`/api/community/${id}`);
    return response.data;
  },
  getJoinedCommunities: async () => {
    const response = await api.get("/api/community/joined");
    return response.data;
  },
  joinCommunity: async (communityId: string) => {
    const response = await api.post(`/api/community/${communityId}/join`);
    return response.data;
  },
  leaveCommunity: async (communityId: string) => {
    const response = await api.delete(`/api/community/${communityId}/leave`);
    return response.data;
  },
  // Join Requests (Private Communities)
  requestToJoin: async (communityId: string, message?: string) => {
    const response = await api.post(
      `/api/community/${communityId}/request-join`,
      { message },
    );
    return response.data;
  },
  getJoinRequests: async (communityId: string) => {
    const response = await api.get(
      `/api/community/${communityId}/join-requests`,
    );
    return response.data;
  },
  getJoinRequestStatus: async (communityId: string) => {
    const response = await api.get(
      `/api/community/${communityId}/join-request-status`,
    );
    return response.data;
  },
  handleJoinRequest: async (
    requestId: string,
    action: "approve" | "reject",
  ) => {
    const response = await api.put(
      `/api/community/join-requests/${requestId}`,
      { action },
    );
    return response.data;
  },
  cancelJoinRequest: async (communityId: string) => {
    const response = await api.delete(
      `/api/community/${communityId}/cancel-request`,
    );
    return response.data;
  },
  getPendingRequestsCount: async (communityId: string) => {
    const response = await api.get(
      `/api/community/${communityId}/pending-requests-count`,
    );
    return response.data;
  },
  // Legacy/Other
  likePost: async (postId: string) => {
    const response = await api.post(`/api/community/posts/${postId}/like`);
    return response.data;
  },
  unlikePost: async (postId: string) => {
    const response = await api.delete(`/api/community/posts/${postId}/like`);
    return response.data;
  },
  getComments: async (postId: string) => {
    const response = await api.get(`/api/community/posts/${postId}/comments`);
    return response.data.data;
  },
  addComment: async ({
    postId,
    content,
    parentId,
  }: {
    postId: string;
    content: string;
    parentId?: string;
  }) => {
    const response = await api.post(`/api/community/posts/${postId}/comment`, {
      content,
      parentId,
    });
    return response.data;
  },
  likeComment: async (commentId: string) => {
    const response = await api.post(
      `/api/community/comments/${commentId}/like`,
    );
    return response.data;
  },
  unlikeComment: async (commentId: string) => {
    const response = await api.delete(
      `/api/community/comments/${commentId}/like`,
    );
    return response.data;
  },
  editComment: async ({
    commentId,
    content,
    postId,
  }: {
    commentId: string;
    content: string;
    postId?: string;
  }) => {
    const response = await api.put(`/api/community/comments/${commentId}`, {
      content,
    });
    return response.data;
  },
  deletePost: async (postId: string) => {
    const response = await api.delete(`/api/community/posts/${postId}`);
    return response.data;
  },
  deleteComment: async ({
    postId,
    commentId,
  }: {
    postId: string;
    commentId: string;
  }) => {
    const response = await api.delete(
      `/api/community/posts/${postId}/comments/${commentId}`,
    );
    return response.data;
  },
};

export const followApi = {
  follow: async (userId: string) => {
    const response = await api.post(`/api/follow/follow/${userId}`);
    return response.data;
  },
  unfollow: async (userId: string) => {
    const response = await api.delete(`/api/follow/unfollow/${userId}`);
    return response.data;
  },
  getFollowers: async (userId: string) => {
    const response = await api.get(`/api/follow/followers/${userId}`);
    return response.data.data;
  },
  getFollowing: async (userId: string) => {
    const response = await api.get(`/api/follow/following/${userId}`);
    return response.data.data;
  },
  checkFollowing: async (userId: string) => {
    const response = await api.get(`/api/follow/check/${userId}`);
    return response.data as { success: boolean; isFollowing: boolean };
  },
};

export const profileApi = {
  getProfile: async (userId: string) => {
    const response = await api.get(`/api/profile/user/${userId}`);
    return response.data.data;
  },
  updateProfile: async (userId: string, forData: any) => {
    const response = await api.put(`/api/profile/user/${userId}`, forData);
    return response.data.data;
  },
  deleteProfile: async (userId: string) => {
    const response = await api.delete(`/api/profile/user/${userId}`);
    return response.data;
  },
  searchProfiles: async (query: string) => {
    const response = await api.get("/api/profile/search", {
      params: { q: query },
    });
    return response.data.data;
  },
  getUserPosts: async (
    userId: string,
    { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
  ) => {
    const response = await api.get(`/api/profile/user/${userId}/posts`, {
      params: { page, limit },
    });
    return response.data.data;
  },
  getNotifications: async () => {
    const response = await api.get("/api/profile/notifications/list");
    return response.data.data;
  },
  markNotificationAsRead: async (notificationId: string) => {
    const response = await api.put(
      `/api/profile/notifications/${notificationId}`,
    );
    return response.data;
  },
};

export const notificationApi = {
  getNotifications: async ({
    page = 1,
    limit = 20,
  }: { page?: number; limit?: number } = {}) => {
    const response = await api.get("/api/notifications", {
      params: { page, limit },
    });
    return response.data as NotificationsResponse;
  },
  getUnreadCount: async () => {
    const response = await api.get("/api/notifications/unread-count");
    return response.data as UnreadCountResponse;
  },
  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.put("/api/notifications/read-all");
    return response.data;
  },
  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },
  clearAll: async () => {
    const response = await api.delete("/api/notifications");
    return response.data;
  },
};

export const blockApi = {
  getBlockedUsers: async () => {
    const response = await api.get("/api/block/list");
    return response.data.data;
  },
  blockUser: async (userId: string) => {
    const response = await api.post(`/api/block/${userId}`);
    return response.data;
  },
  unblockUser: async (userId: string) => {
    const response = await api.delete(`/api/block/${userId}`);
    return response.data;
  },
};
export const messageApi = {
  getConversations: async () => {
    const response = await api.get("/api/message");
    return response.data;
  },
  getMessages: async (
    conversationId: string,
    { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
  ) => {
    const response = await api.get(`/api/message/${conversationId}`, {
      params: { page, limit },
    });
    return response.data;
  },
  sendMessage: async (data: {
    conversationId?: string;
    receiverId?: string;
    content: string;
    images?: string[];
  }) => {
    const response = await api.post("/api/message/send", data);
    return response.data;
  },
  getOrCreateConversation: async (receiverId: string) => {
    const response = await api.post("/api/message/get-or-create", {
      receiverId,
    });
    return response.data;
  },
  markAsRead: async (conversationId: string) => {
    const response = await api.put(`/api/message/${conversationId}/read`);
    return response.data;
  },

  updateMessage: async (messageId: string, content: string) => {
    const response = await api.put(`/api/message/${messageId}`, { content });
    return response.data;
  },

  deleteMessage: async (messageId: string) => {
    const response = await api.delete(`/api/message/${messageId}`);
    return response.data;
  },
};

export const serviceApi = {
  // Services CRUD
  getMyServices: async () => {
    const response = await api.get("/api/service/mine");
    return response.data as MyServicesResponse;
  },
  getAllServices: async (params?: {
    category?: string;
    search?: string;
    creator_id?: string;
  }) => {
    const response = await api.get("/api/service", { params });
    return response.data;
  },
  getServiceById: async (id: string) => {
    const response = await api.get(`/api/service/${id}`);
    return response.data;
  },
  createService: async (data: {
    title: string;
    description?: string;
    category?: string;
    price?: number;
    thumbnail_url?: string;
  }) => {
    const response = await api.post("/api/service", data);
    return response.data as CreateServiceResponse;
  },
  updateService: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      price?: number;
      thumbnail_url?: string;
      status?: string;
    },
  ) => {
    const response = await api.put(`/api/service/${id}`, data);
    return response.data;
  },
  deleteService: async (id: string) => {
    const response = await api.delete(`/api/service/${id}`);
    return response.data;
  },
  publishService: async (id: string) => {
    const response = await api.post(`/api/service/${id}/publish`);
    return response.data;
  },
  unpublishService: async (id: string) => {
    const response = await api.post(`/api/service/${id}/unpublish`);
    return response.data;
  },

  // Modules
  createModule: async (serviceId: string, data: { title: string }) => {
    const response = await api.post(`/api/service/${serviceId}/modules`, data);
    return response.data;
  },
  getModules: async (serviceId: string) => {
    const response = await api.get(`/api/service/${serviceId}/modules`);
    return response.data;
  },
  updateModule: async (
    moduleId: string,
    data: { title?: string; order_index?: number },
  ) => {
    const response = await api.put(`/api/service/modules/${moduleId}`, data);
    return response.data;
  },
  deleteModule: async (moduleId: string) => {
    const response = await api.delete(`/api/service/modules/${moduleId}`);
    return response.data;
  },

  // Lessons
  createLesson: async (
    moduleId: string,
    data: {
      title: string;
      description?: string;
      video_url?: string;
      video_duration?: number;
      is_preview?: boolean;
    },
  ) => {
    const response = await api.post(
      `/api/service/modules/${moduleId}/lessons`,
      data,
    );
    return response.data;
  },
  getLessons: async (moduleId: string) => {
    const response = await api.get(`/api/service/modules/${moduleId}/lessons`);
    return response.data;
  },
  updateLesson: async (
    lessonId: string,
    data: {
      title?: string;
      description?: string;
      video_url?: string;
      video_duration?: number;
      is_preview?: boolean;
      order_index?: number;
    },
  ) => {
    const response = await api.put(`/api/service/lessons/${lessonId}`, data);
    return response.data;
  },
  deleteLesson: async (lessonId: string) => {
    const response = await api.delete(`/api/service/lessons/${lessonId}`);
    return response.data;
  },

  // Resources
  addResource: async (
    serviceId: string,
    data: {
      title: string;
      file_url: string;
      file_type?: string;
      file_size?: number;
      lesson_id?: string;
    },
  ) => {
    const response = await api.post(
      `/api/service/${serviceId}/resources`,
      data,
    );
    return response.data;
  },
  getResources: async (serviceId: string) => {
    const response = await api.get(`/api/service/${serviceId}/resources`);
    return response.data;
  },
  deleteResource: async (resourceId: string) => {
    const response = await api.delete(`/api/service/resources/${resourceId}`);
    return response.data;
  },
};

export const purchaseApi = {
  createPurchase: async (data: { service_id: string; amount: number }) => {
    const response = await api.post("/api/purchase", data);
    return response.data;
  },
  getPurchases: async () => {
    const response = await api.get("/api/purchase");
    return response.data; // Returns { success: true, data: [...] }
  },
};

export const reviewApi = {
  createReview: async (data: {
    service_id: string;
    rating: number;
    review_text?: string;
  }) => {
    const response = await api.post("/api/reviews", data);
    return response.data;
  },
  updateReview: async (
    id: string,
    data: { rating?: number; review_text?: string },
  ) => {
    const response = await api.put(`/api/reviews/${id}`, data);
    return response.data;
  },
  deleteReview: async (id: string) => {
    const response = await api.delete(`/api/reviews/${id}`);
    return response.data;
  },
  getServiceReviews: async (
    serviceId: string,
    params?: { page?: number; limit?: number; sort?: string },
  ) => {
    const response = await api.get(`/api/reviews/service/${serviceId}`, {
      params,
    });
    return response.data;
  },
  getReviewStats: async (serviceId: string) => {
    const response = await api.get(`/api/reviews/service/${serviceId}/stats`);
    return response.data;
  },
  getMyReview: async (serviceId: string) => {
    const response = await api.get(`/api/reviews/service/${serviceId}/mine`);
    return response.data;
  },
};

export const reportApi = {
  submitReport: async (data: {
    reported_user_id: string;
    content_type: string;
    reason: string;
    description?: string;
  }) => {
    const response = await api.post("/api/moderation/report", data);
    return response.data;
  },
};

export default api;
