import { useQuery } from "@tanstack/react-query";
import { creatorApi } from "../lib/api";
import { useAuthState } from "./useAuthState";

export interface CreatorStats {
  wallet_balance: number;
  pending_payout: number;
  currency: string;
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
