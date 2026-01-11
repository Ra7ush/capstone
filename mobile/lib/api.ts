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

export default api;
