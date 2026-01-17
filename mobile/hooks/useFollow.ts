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
    onMutate: async (targetUserId) => {
      // 1. Cancel related queries
      await queryClient.cancelQueries({ queryKey: ["following", userId] });
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      // 2. Snapshot previous values
      const previousFollowing = queryClient.getQueryData<any[]>([
        "following",
        userId,
      ]);
      const previousPosts = queryClient.getQueryData(["posts"]);

      // 3. Optimistically patch the "posts" feed (Level 4)
      // Every post from this creator should now show "Following"
      queryClient.setQueriesData({ queryKey: ["posts"] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((post: any) =>
              post.user_id === targetUserId
                ? { ...post, is_following: true }
                : post
            ),
          })),
        };
      });

      // 4. Optimistically add to the "following" list
      if (previousFollowing) {
        queryClient.setQueryData(["following", userId], (old: any[]) => [
          ...(old || []),
          { id: targetUserId, status: "following" }, // Minimal object to maintain list count
        ]);
      }

      return { previousFollowing, previousPosts };
    },
    onError: (err, variables, context) => {
      if (context?.previousFollowing) {
        queryClient.setQueryData(
          ["following", userId],
          context.previousFollowing
        );
      }
      if (context?.previousPosts) {
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: followApi.unfollow,
    onMutate: async (targetUserId) => {
      // 1. Cancel related queries
      await queryClient.cancelQueries({ queryKey: ["following", userId] });
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      // 2. Snapshot previous values
      const previousFollowing = queryClient.getQueryData<any[]>([
        "following",
        userId,
      ]);
      const previousPosts = queryClient.getQueryData(["posts"]);

      // 3. Optimistically patch the "posts" feed (Level 4)
      queryClient.setQueriesData({ queryKey: ["posts"] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((post: any) =>
              post.user_id === targetUserId
                ? { ...post, is_following: false }
                : post
            ),
          })),
        };
      });

      // 4. Optimistically remove from the "following" list
      if (previousFollowing) {
        queryClient.setQueryData(["following", userId], (old: any[]) =>
          old?.filter((f) => f.id !== targetUserId)
        );
      }

      return { previousFollowing, previousPosts };
    },
    onError: (err, variables, context) => {
      if (context?.previousFollowing) {
        queryClient.setQueryData(
          ["following", userId],
          context.previousFollowing
        );
      }
      if (context?.previousPosts) {
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
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
