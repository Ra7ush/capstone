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

// Add a request interceptor to include the auth token
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

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
  }: { page?: number; limit?: number } = {}) => {
    const response = await api.get("/api/community/posts/feed", {
      params: { page, limit },
    });
    return response.data;
  },
  createPost: async (postData: { content: string; images?: string[] }) => {
    const response = await api.post("/api/community/posts", postData);
    return response.data;
  },
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
  }: {
    commentId: string;
    content: string;
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

export default api;
