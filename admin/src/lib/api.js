import axiosInstance from "./axios";

export const login = {
  AdminLogin: async ({ email, password }) => {
    try {
      const response = await axiosInstance.post("/admin/login", {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },
};

export const dashboardApi = {
  getDashboardStats: async (timeRange = "1Y") => {
    try {
      const response = await axiosInstance.get(
        `/admin/dashboard/stats?range=${timeRange}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  },
  getSystemHealth: async () => {
    try {
      const response = await axiosInstance.get("/admin/system/health");
      return response.data;
    } catch (error) {
      console.error("Error fetching system health:", error);
      throw error;
    }
  },
};

export const usersApi = {
  getAllUsers: async () => {
    try {
      const response = await axiosInstance.get("/admin/users");
      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },
  updateUser: async (id, formData) => {
    try {
      const response = await axiosInstance.put(`/admin/users/${id}`, formData);
      return response.data;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },
  deleteUser: async (id) => {
    try {
      const response = await axiosInstance.delete(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },
};

export const payoutApi = {
  getAllFinancialsStatus: async () => {
    try {
      const response = await axiosInstance.get("/admin/payouts");
      return response.data;
    } catch (error) {
      console.error("Error fetching financial status:", error);
      throw error;
    }
  },
  getTransactionsHistory: async () => {
    try {
      const response = await axiosInstance.get("/admin/payouts/history");
      return response.data;
    } catch (error) {
      console.error("Error fetching transactions history:", error);
      throw error;
    }
  },
  processAllPayouts: async () => {
    try {
      const response = await axiosInstance.post("/admin/payouts/process-all");
      return response.data;
    } catch (error) {
      console.error("Error processing all payouts:", error);
      throw error;
    }
  },
  processSinglePayout: async (id, formData) => {
    try {
      const response = await axiosInstance.post(
        `/admin/payouts/process-single/${id}`,
        formData
      );
      return response.data;
    } catch (error) {
      console.error("Error processing single payout:", error);
      throw error;
    }
  },
};

export const moderationApi = {
  getAllModerations: async () => {
    try {
      const response = await axiosInstance.get("/admin/moderations");
      return response.data;
    } catch (error) {
      console.error("Error fetching moderations:", error);
      throw error;
    }
  },
  updateModeration: async (id, { status, admin_notes, action }) => {
    try {
      const response = await axiosInstance.put(`/admin/moderations/${id}`, {
        status,
        admin_notes,
        action,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating moderation:", error);
      throw error;
    }
  },
};
