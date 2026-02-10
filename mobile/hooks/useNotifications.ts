import { useEffect, useCallback } from "react";
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

  // ──────────────────────────────────────────
  // Queries
  // ──────────────────────────────────────────

  /** Paginated notification list */
  const notificationsQuery = useInfiniteQuery<NotificationsResponse>({
    queryKey: [NOTIFICATIONS_KEY],
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
  });

  /** Unread notification count (for badge) */
  const unreadCountQuery = useQuery({
    queryKey: [UNREAD_COUNT_KEY],
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
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_KEY] });
      await queryClient.cancelQueries({ queryKey: [UNREAD_COUNT_KEY] });

      queryClient.setQueriesData(
        { queryKey: [NOTIFICATIONS_KEY] },
        (old: any) => {
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
        },
      );

      queryClient.setQueryData([UNREAD_COUNT_KEY], (old: number) =>
        Math.max((old || 0) - 1, 0),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_KEY] });

      queryClient.setQueriesData(
        { queryKey: [NOTIFICATIONS_KEY] },
        (old: any) => {
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
        },
      );

      queryClient.setQueryData([UNREAD_COUNT_KEY], 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: notificationApi.deleteNotification,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_KEY] });

      queryClient.setQueriesData(
        { queryKey: [NOTIFICATIONS_KEY] },
        (old: any) => {
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
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: notificationApi.clearAll,
    onMutate: async () => {
      queryClient.setQueriesData(
        { queryKey: [NOTIFICATIONS_KEY] },
        (old: any) => {
          if (!old?.pages) return old;
          return { ...old, pages: [{ ...old.pages[0], data: [] }] };
        },
      );
      queryClient.setQueryData([UNREAD_COUNT_KEY], 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });

  // ──────────────────────────────────────────
  // Realtime Subscription
  // ──────────────────────────────────────────

  const handleNewNotification = useCallback(
    (payload: any) => {
      // Add the new notification to the top of the list
      queryClient.setQueriesData(
        { queryKey: [NOTIFICATIONS_KEY] },
        (old: any) => {
          if (!old?.pages) return old;
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              { ...firstPage, data: [payload, ...firstPage.data] },
              ...old.pages.slice(1),
            ],
          };
        },
      );

      // Increment unread count
      queryClient.setQueryData(
        [UNREAD_COUNT_KEY],
        (old: number) => (old || 0) + 1,
      );
    },
    [queryClient],
  );

  useEffect(() => {
    if (!userId) return;

    // Subscribe to the user's personal notification channel
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("broadcast", { event: "new_notification" }, ({ payload }) => {
        handleNewNotification(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, handleNewNotification]);

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
