import axios from "axios";
import { supabase } from "./supabase";

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

export const verificationApi = {
  submitVerification: async (data: any) => {
    const response = await api.post("/api/creator/verify", data);
    return response.data;
  },
  getStatus: async () => {
    const response = await api.get("/api/creator/verification-status");
    return response.data;
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
  getDiscoverCommunities: async (category?: string) => {
    const response = await api.get("/api/community/discover", {
      params: { category },
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
      `/api/community/comments/${commentId}/like`
    );
    return response.data;
  },
  unlikeComment: async (commentId: string) => {
    const response = await api.delete(
      `/api/community/comments/${commentId}/like`
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
      `/api/community/posts/${postId}/comments/${commentId}`
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
  getNotifications: async () => {
    const response = await api.get("/api/profile/notifications/list");
    return response.data.data;
  },
  markNotificationAsRead: async (notificationId: string) => {
    const response = await api.put(
      `/api/profile/notifications/${notificationId}`
    );
    return response.data;
  },
};
export default api;
