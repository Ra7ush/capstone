import { useEffect, useCallback, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { notificationApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuthState } from "./useAuthState";
import type { Notification, NotificationsResponse } from "@/types";

const NOTIFICATIONS_KEY = "notifications";
const UNREAD_COUNT_KEY = "notifications-unread-count";

/**
 * Hook for managing notifications with real-time updates.
 *
 * Features:
 * - Paginated notification list (infinite scroll)
 * - Unread count badge
 * - Mark as read (single / all)
 * - Delete (single / all)
 * - Supabase Realtime subscription for instant updates
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const { session } = useAuthState();
  const userId = session?.user?.id;
  const notificationsKey = useMemo(() => [NOTIFICATIONS_KEY, userId], [userId]);
  const unreadKey = useMemo(() => [UNREAD_COUNT_KEY, userId], [userId]);

  // ──────────────────────────────────────────
  // Queries
  // ──────────────────────────────────────────

  /** Paginated notification list */
  const notificationsQuery = useInfiniteQuery<NotificationsResponse>({
    queryKey: notificationsKey,
    queryFn: ({ pageParam }) =>
      notificationApi.getNotifications({
        page: pageParam as number,
        limit: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  /** Unread notification count (for badge) */
  const unreadCountQuery = useQuery({
    queryKey: unreadKey,
    queryFn: async () => {
      const res = await notificationApi.getUnreadCount();
      return res.data.count;
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Poll every minute as fallback
  });

  // ──────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────

  const markAsReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });

      queryClient.setQueriesData({ queryKey: notificationsKey }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((n: Notification) =>
              n.id === notificationId ? { ...n, is_read: true } : n,
            ),
          })),
        };
      });

      queryClient.setQueryData(unreadKey, (old: number) =>
        Math.max((old || 0) - 1, 0),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });

      queryClient.setQueriesData({ queryKey: notificationsKey }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((n: Notification) => ({
              ...n,
              is_read: true,
            })),
          })),
        };
      });

      queryClient.setQueryData(unreadKey, 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: notificationApi.deleteNotification,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });

      queryClient.setQueriesData({ queryKey: notificationsKey }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.filter(
              (n: Notification) => n.id !== notificationId,
            ),
          })),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: notificationApi.clearAll,
    onMutate: async () => {
      queryClient.setQueriesData({ queryKey: notificationsKey }, (old: any) => {
        if (!old?.pages) return old;
        return { ...old, pages: [{ ...old.pages[0], data: [] }] };
      });
      queryClient.setQueryData(unreadKey, 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  // ──────────────────────────────────────────
  // Realtime Subscription
  // ──────────────────────────────────────────

  const handleNewNotification = useCallback(
    (payload: any) => {
      // Add the new notification to the top of the list
      queryClient.setQueriesData({ queryKey: notificationsKey }, (old: any) => {
        if (!old?.pages) return old;
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            { ...firstPage, data: [payload, ...firstPage.data] },
            ...old.pages.slice(1),
          ],
        };
      });

      // Increment unread count
      queryClient.setQueryData(unreadKey, (old: number) => (old || 0) + 1);
    },
    [queryClient, notificationsKey, unreadKey],
  );

  useEffect(() => {
    if (!userId) return;

    // Subscribe to the user's personal notification channel (broadcasts)
    const broadcastChannel = supabase
      .channel(`notifications:${userId}`)
      .on("broadcast", { event: "new_notification" }, ({ payload }) => {
        handleNewNotification(payload);
      })
      .subscribe();

    // Fallback: listen to DB inserts/updates directly
    const dbChannel = supabase
      .channel(`notifications-db:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            handleNewNotification(payload.new);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: notificationsKey });
          queryClient.invalidateQueries({ queryKey: unreadKey });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: notificationsKey });
          queryClient.invalidateQueries({ queryKey: unreadKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
    };
  }, [userId, handleNewNotification, notificationsKey, unreadKey, queryClient]);

  // ──────────────────────────────────────────
  // Derived Data
  // ──────────────────────────────────────────

  const notifications: Notification[] =
    notificationsQuery.data?.pages?.flatMap((page) => page.data) ?? [];

  const unreadCount = unreadCountQuery.data ?? 0;

  return {
    // Data
    notifications,
    unreadCount,

    // Loading States
    isLoading: notificationsQuery.isLoading,
    isFetchingNextPage: notificationsQuery.isFetchingNextPage,
    hasNextPage: notificationsQuery.hasNextPage,

    // Actions
    fetchNextPage: notificationsQuery.fetchNextPage,
    refetch: notificationsQuery.refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    clearAll: clearAllMutation.mutate,
  };
}
