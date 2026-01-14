import axios from "axios";
import { supabase } from "./supabase";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Add auth token to every request
axiosInstance.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle session invalidation
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 (Unauthorized) or 429 (Too Many Requests)
    if (error.response?.status === 401 || error.response?.status === 429) {
      console.warn(
        `Session error (${error.response.status}). Forcing nuclear logout.`
      );
      try {
        await supabase.auth.signOut();
      } catch (logoutError) {
        console.error("SignOut failed, forcing redirect:", logoutError);
      } finally {
        // Nuclear option: Clear local storage to remove the ghost session
        localStorage.clear();
        // Force redirect to login
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
