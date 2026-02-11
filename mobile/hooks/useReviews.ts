import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { reviewApi } from "@/lib/api";
import type { Review, ReviewStats, ReviewsResponse } from "@/types";

// ============================================
// Query Keys
// ============================================

export const reviewKeys = {
  all: ["reviews"] as const,
  service: (serviceId: string) =>
    [...reviewKeys.all, "service", serviceId] as const,
  stats: (serviceId: string) =>
    [...reviewKeys.all, "stats", serviceId] as const,
  mine: (serviceId: string) => [...reviewKeys.all, "mine", serviceId] as const,
};

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch paginated reviews for a service
 */
export function useServiceReviews(
  serviceId: string | undefined,
  sort: string = "newest",
) {
  return useInfiniteQuery<ReviewsResponse>({
    queryKey: [...reviewKeys.service(serviceId || ""), sort],
    queryFn: async ({ pageParam }) => {
      if (!serviceId) throw new Error("Service ID required");
      const response = await reviewApi.getServiceReviews(serviceId, {
        page: pageParam as number,
        limit: 10,
        sort,
      });
      return response as ReviewsResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch review stats (average, distribution) for a service
 */
export function useReviewStats(serviceId: string | undefined) {
  return useQuery<ReviewStats>({
    queryKey: reviewKeys.stats(serviceId || ""),
    queryFn: async () => {
      if (!serviceId) throw new Error("Service ID required");
      const response = await reviewApi.getReviewStats(serviceId);
      return response.data as ReviewStats;
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch current user's review for a service
 */
export function useMyReview(serviceId: string | undefined) {
  return useQuery<Review | null>({
    queryKey: reviewKeys.mine(serviceId || ""),
    queryFn: async () => {
      if (!serviceId) throw new Error("Service ID required");
      const response = await reviewApi.getMyReview(serviceId);
      return (response.data as Review) || null;
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create or update a review
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      service_id: string;
      rating: number;
      review_text?: string;
    }) => reviewApi.createReview(data),
    onSuccess: (_, variables) => {
      // Invalidate all review-related queries for this service
      queryClient.invalidateQueries({
        queryKey: reviewKeys.service(variables.service_id),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.stats(variables.service_id),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.mine(variables.service_id),
      });
      // Also invalidate service detail to refresh avg rating
      queryClient.invalidateQueries({
        queryKey: ["services", "detail", variables.service_id],
      });
    },
  });
}

/**
 * Update an existing review
 */
export function useUpdateReview(serviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { rating?: number; review_text?: string };
    }) => reviewApi.updateReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.service(serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.stats(serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.mine(serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: ["services", "detail", serviceId],
      });
    },
  });
}

/**
 * Delete a review
 */
export function useDeleteReview(serviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewApi.deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.service(serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.stats(serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewKeys.mine(serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: ["services", "detail", serviceId],
      });
    },
  });
}
