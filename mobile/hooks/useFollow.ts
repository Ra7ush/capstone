import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { followApi } from "@/lib/api";

export function useFollow(userId?: string) {
  const queryClient = useQueryClient();

  // --- Queries ---

  const followersQuery = useQuery({
    queryKey: ["followers", userId],
    queryFn: () => followApi.getFollowers(userId!),
    enabled: !!userId,
  });

  const followingQuery = useQuery({
    queryKey: ["following", userId],
    queryFn: () => followApi.getFollowing(userId!),
    enabled: !!userId,
  });

  // --- Mutations ---

  const followMutation = useMutation({
    mutationFn: followApi.follow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      // Also invalidate community feed to update follow status if returned in post object
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: followApi.unfollow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  return {
    followers: followersQuery.data || [],
    isLoadingFollowers: followersQuery.isLoading,
    following: followingQuery.data || [],
    isLoadingFollowing: followingQuery.isLoading,
    follow: followMutation.mutateAsync,
    isFollowing: followMutation.isPending,
    unfollow: unfollowMutation.mutateAsync,
    isUnfollowing: unfollowMutation.isPending,
  };
}
