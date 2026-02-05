import { useQuery } from "@tanstack/react-query";
import { creatorApi } from "../lib/api";
import { useAuthState } from "./useAuthState";

export interface CreatorStats {
  wallet_balance: number;
  pending_payout: number;
  followers_count: number;
  monthly_revenue: number;
  total_earnings: number;
  average_rating: number;
  total_ratings: number;
  currency: string;
}

export interface ActivityItem {
  id: string;
  type: "follow" | "comment" | "like";
  message: string;
  user: {
    id: string;
    username: string;
    full_name: string | null;
    profile_image_url: string | null;
  } | null;
  created_at: string;
}

export function useCreatorStats() {
  const { session } = useAuthState();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["creator", "stats", userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const data = await creatorApi.getStats(userId);
        return data as CreatorStats;
      } catch (error) {
        console.error("Error fetching creator stats:", error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useRecentActivity() {
  const { session } = useAuthState();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["creator", "activity", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const data = await creatorApi.getRecentActivity();
        return data as ActivityItem[];
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}
