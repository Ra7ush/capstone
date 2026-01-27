import { useQueryClient } from "@tanstack/react-query";
import {
  usersApi,
  payoutApi,
  moderationApi,
  verificationApi,
  dashboardApi,
} from "../lib/api";

/**
 * Hook to handle prefetching for Admin routes
 */
export function useAdminPrefetch() {
  const queryClient = useQueryClient();

  const prefetchData = async (path) => {
    switch (path) {
      case "/users":
        await queryClient.prefetchQuery({
          queryKey: ["users"],
          queryFn: usersApi.getAllUsers,
          staleTime: 1000 * 60 * 5,
        });
        break;
      case "/finances":
        // Prefetch multiple finance-related queries
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ["finances-status"],
            queryFn: payoutApi.getAllFinancialsStatus,
            staleTime: 1000 * 60 * 5,
          }),
          queryClient.prefetchQuery({
            queryKey: ["payouts-history"],
            queryFn: payoutApi.getTransactionsHistory,
            staleTime: 1000 * 60 * 5,
          }),
        ]);
        break;
      case "/moderations":
        await queryClient.prefetchQuery({
          queryKey: ["moderations"],
          queryFn: moderationApi.getAllModerations,
          staleTime: 1000 * 60 * 5,
        });
        break;
      case "/verifications":
        await queryClient.prefetchQuery({
          queryKey: ["verifications-pending"],
          queryFn: verificationApi.getAllPendingVerifications,
          staleTime: 1000 * 60 * 5,
        });
        break;
      case "/health":
        await queryClient.prefetchQuery({
          queryKey: ["system-health"],
          queryFn: dashboardApi.getSystemHealth,
          staleTime: 1000 * 30, // Shorter stale time for health
        });
        break;
      default:
        break;
    }
  };

  /**
   * Run a global warm-up (prefetch everything)
   * Good for when the user first enters the Dashboard
   */
  const warmUpCache = () => {
    ["/users", "/finances", "/moderations", "/verifications"].forEach((path) =>
      prefetchData(path),
    );
  };

  return { prefetchData, warmUpCache };
}
