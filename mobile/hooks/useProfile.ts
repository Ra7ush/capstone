import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../lib/api";
import { useAuthState } from "./useAuthState";
import { User } from "../types";

// Extends User to include optional joined fields if necessary
export type UserProfile = User & {
  bio?: string;
  verification_status?: string;
  avatar_url?: string | null;
};

export function useUser() {
  const { session } = useAuthState();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["users", userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const data = await profileApi.getProfile(userId);
        return data as UserProfile;
      } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours for persistence
  });
}

export function useCreatorProfile(creatorId: string) {
  return useQuery({
    queryKey: ["creators", creatorId],
    queryFn: async () => {
      if (!creatorId) return null;
      try {
        const data = await profileApi.getProfile(creatorId);
        return data as UserProfile;
      } catch (error) {
        console.error("Error fetching creator profile:", error);
        throw error;
      }
    },
    enabled: !!creatorId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { session, refresh } = useAuthState();
  const userId = session?.user?.id;

  return useMutation({
    mutationFn: async (updates: {
      full_name?: string;
      username?: string;
      bio?: string;
    }) => {
      if (!userId) throw new Error("No user");

      // Filter updates to only allow full_name, username, and bio
      const filteredUpdates: Record<string, any> = {};
      if (updates.full_name !== undefined)
        filteredUpdates.full_name = updates.full_name;
      if (updates.username !== undefined)
        filteredUpdates.username = updates.username;
      if (updates.bio !== undefined) filteredUpdates.bio = updates.bio;

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error("No valid fields to update");
      }

      return profileApi.updateProfile(userId, filteredUpdates);
    },
    onMutate: async (updates) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["users", userId] });
      await queryClient.cancelQueries({ queryKey: ["creators", userId] });

      // Snapshot the previous value
      const previousUser = queryClient.getQueryData(["users", userId]);
      const previousCreator = queryClient.getQueryData(["creators", userId]);

      // Optimistically update to the new value
      if (previousUser) {
        queryClient.setQueryData(["users", userId], (old: any) => ({
          ...old,
          ...updates,
        }));
      }

      return { previousUser, previousCreator };
    },
    onError: (err, updates, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUser) {
        queryClient.setQueryData(["users", userId], context.previousUser);
      }
      if (context?.previousCreator) {
        queryClient.setQueryData(["creators", userId], context.previousCreator);
      }
    },
    onSettled: async () => {
      // Always refetch after error or success to guarantee sync
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
      queryClient.invalidateQueries({ queryKey: ["creators", userId] });
      await refresh();
    },
  });
}

export function useSearchProfiles(query: string) {
  return useQuery({
    queryKey: ["profiles", "search", query],
    queryFn: () => profileApi.searchProfiles(query),
    enabled: query.length >= 2,
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  const { session } = useAuthState();
  const userId = session?.user?.id;

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("No user");
      return profileApi.deleteProfile(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
    },
  });
}

export function useNotifications() {
  const { session } = useAuthState();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => profileApi.getNotifications(),
    enabled: !!userId,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { session } = useAuthState();
  const userId = session?.user?.id;

  return useMutation({
    mutationFn: (notificationId: string) =>
      profileApi.markNotificationAsRead(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      const previousNotifications = queryClient.getQueryData<any[]>([
        "notifications",
        userId,
      ]);

      if (previousNotifications) {
        queryClient.setQueryData(["notifications", userId], (old: any[]) =>
          old?.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
      }

      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications", userId],
          context.previousNotifications
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });
}
