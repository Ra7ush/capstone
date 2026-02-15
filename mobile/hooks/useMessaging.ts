import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { messageApi } from "../lib/api";
import * as ImageManipulator from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useAuthState } from "./useAuthState";
import { getCachedMessages, setCachedMessages } from "../lib/messageCache";

export function useMessaging() {
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});
  const typingTimeoutsRef = useRef<Record<string, any>>({});

  // Fetch all conversations
  const {
    data: conversations,
    isLoading: loadingConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await messageApi.getConversations();
      return res.data;
    },
    staleTime: 0,
  });

  // Real-time listener
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`messaging_global_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();

    // Listen for global typing indicators on personal notifications channel
    const notifChannel = supabase
      .channel(`notifications:${user.id}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { conversationId, isTyping } = payload;
        if (!conversationId) return;

        setTypingStates((prev) => ({
          ...prev,
          [conversationId]: isTyping,
        }));

        // Auto-clear
        if (isTyping) {
          if (typingTimeoutsRef.current[conversationId]) {
            clearTimeout(typingTimeoutsRef.current[conversationId]);
          }
          typingTimeoutsRef.current[conversationId] = setTimeout(() => {
            setTypingStates((prev) => ({
              ...prev,
              [conversationId]: false,
            }));
          }, 4000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notifChannel);
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [queryClient, user?.id]);

  return {
    conversations,
    loadingConversations,
    refetchConversations,
    typingStates,
  };
}

/**
 * Lightweight hook to get total unread message count across all conversations.
 * Shares the same query cache as useMessaging — no extra network requests.
 */
export function useUnreadMessageCount() {
  const { conversations } = useMessaging();

  const unreadCount =
    conversations?.reduce(
      (total: number, conv: any) => total + (conv.unreadCount || 0),
      0,
    ) ?? 0;

  return unreadCount;
}

/**
 * Hook for Instagram-style message requests.
 * Returns pending requests, count, and accept/decline mutations.
 */
export function useMessageRequests() {
  const queryClient = useQueryClient();
  const { user } = useAuthState();

  // Fetch pending requests
  const {
    data: requests,
    isLoading: loadingRequests,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ["message-requests"],
    queryFn: async () => {
      const res = await messageApi.getMessageRequests();
      return res.data;
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  // Fetch pending request count
  const { data: requestCountData } = useQuery({
    queryKey: ["message-requests-count"],
    queryFn: async () => {
      const res = await messageApi.getMessageRequestsCount();
      return res.data.count;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const requestCount = requestCountData ?? 0;

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: messageApi.acceptMessageRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-requests"] });
      queryClient.invalidateQueries({ queryKey: ["message-requests-count"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages-v3"] });
    },
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: messageApi.declineMessageRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-requests"] });
      queryClient.invalidateQueries({ queryKey: ["message-requests-count"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    requests: requests || [],
    requestCount,
    loadingRequests,
    refetchRequests,
    acceptRequest: acceptMutation.mutateAsync,
    declineRequest: declineMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,
    isDeclining: declineMutation.isPending,
  };
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receiverId: string) => {
      const response = await messageApi.getOrCreateConversation(receiverId);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useChat(conversationId: string, userId?: string) {
  const queryClient = useQueryClient();
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  // State for cached data (loaded on mount)
  const [cachedData, setCachedData] = useState<{
    messages: any[];
    otherUser: any;
  } | null>(null);
  // Load cached messages on mount (instant load)
  useEffect(() => {
    if (!conversationId) {
      setCachedData(null);
      return;
    }
    let isActive = true;
    setCachedData(null);
    getCachedMessages(conversationId).then((cached) => {
      if (!isActive) return;
      if (cached) {
        setCachedData({
          messages: cached.messages,
          otherUser: cached.otherUser,
        });
      }
    });
    return () => {
      isActive = false;
    };
  }, [conversationId]);
  // Fetch messages with infinite scroll
  const {
    data,
    isLoading: loadingMessages,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage,
    refetch: refetchMessages,
  } = useInfiniteQuery({
    queryKey: ["messages-v3", conversationId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await messageApi.getMessages(conversationId, {
        page: pageParam as number,
        limit: 20,
      });
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    enabled: !!conversationId,
    initialPageParam: 1,
    // Use cached data as placeholder while fetching fresh
    placeholderData: cachedData
      ? {
          pages: [
            {
              messages: cachedData.messages.slice(0, 10),
              other_user: cachedData.otherUser,
              pagination: { page: 1, limit: 10, hasMore: true },
            },
          ],
          pageParams: [1],
        }
      : undefined,
  });

  // Store page 1 to cache after successful fetch
  useEffect(() => {
    if (data?.pages?.[0]?.messages && conversationId) {
      const page1Messages = data.pages[0].messages;
      const page1OtherUser = data.pages[0].other_user;
      setCachedMessages(conversationId, page1Messages, page1OtherUser);
    }
  }, [data?.pages?.[0]?.messages, conversationId]);

  // Flatten all messages from all pages
  const messages = data?.pages?.flatMap((page: any) => page.messages) || [];
  // Use the other_user from the first page
  const otherUser = data?.pages?.[0]?.other_user || null;
  // Message request status
  const requestStatus: string = data?.pages?.[0]?.request_status || "accepted";
  const initiatedBy: string | null = data?.pages?.[0]?.initiated_by || null;

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channelName = `chat_room_${conversationId}`;
    const handleNewMessage = (record: any) => {
      queryClient.setQueryData(["messages-v3", conversationId], (old: any) => {
        if (!old || !old.pages) return old;

        // Clone pages
        const newPages = [...old.pages];
        if (newPages.length === 0) return old;

        // 1. Check if ANY message with this ID already exists in ANY page
        const messageExists = newPages.some((page) =>
          page.messages.some((m: any) => m.id === record.id),
        );
        if (messageExists) return old;

        // 2. Add to the FIRST page (newest)
        const firstPage = { ...newPages[0] };

        // 3. Remove optimistic message if it was sent by us
        // We match by the 'temp-' prefix AND content to find the specific message
        let removedOne = false;
        let bridgeUrls: string[] = [];
        const filteredMessages =
          record.sender_id === userId
            ? firstPage.messages.filter((m: any) => {
                if (
                  !removedOne &&
                  m.id.toString().startsWith("temp-") &&
                  m.content === record.content
                ) {
                  removedOne = true;
                  bridgeUrls = m.image_urls || [];
                  return false;
                }
                return true;
              })
            : firstPage.messages;

        // 4. Attach bridged URLs and ensure identity
        const recordWithBridge = {
          ...record,
          local_urls: bridgeUrls.length > 0 ? bridgeUrls : record.local_urls,
        };

        firstPage.messages = [recordWithBridge, ...filteredMessages];
        newPages[0] = firstPage;

        return { ...old, pages: newPages };
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleUpdateMessage = (record: any) => {
      queryClient.setQueryData(["messages-v3", conversationId], (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: any) =>
              m.id === record.id ? { ...m, ...record } : m,
            ),
          })),
        };
      });
    };

    const handleRemoveMessage = (id: string) => {
      queryClient.setQueryData(["messages-v3", conversationId], (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter((m: any) => m.id !== id),
          })),
        };
      });
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload: any) => {
          const record = payload.new || payload.old;
          if (record?.conversation_id !== conversationId) return;

          if (payload.eventType === "INSERT") handleNewMessage(record);
          else if (payload.eventType === "UPDATE") handleUpdateMessage(record);
        },
      )
      .on("broadcast", { event: "message" }, ({ payload }) => {
        handleNewMessage(payload);
      })
      .on("broadcast", { event: "message_update" }, ({ payload }) => {
        handleUpdateMessage(payload);
      })
      .on("broadcast", { event: "message_delete" }, ({ payload }) => {
        handleRemoveMessage(payload.id);
      })
      .on("broadcast", { event: "read" }, ({ payload }) => {
        queryClient.invalidateQueries({
          queryKey: ["messages-v3", conversationId],
        });
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== userId) {
          setIsOtherUserTyping(payload.isTyping);
          if (payload.isTyping) {
            if (typingTimeoutRef.current)
              clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsOtherUserTyping(false);
            }, 3000);
          }
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, userId]);

  const sendTypingStatus = (isTyping: boolean) => {
    if (!conversationId) return;
    supabase.channel(`chat_room_${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId, isTyping },
    });
    if (otherUser?.id) {
      supabase.channel(`notifications:${otherUser.id}`).send({
        type: "broadcast",
        event: "typing",
        payload: { conversationId, userId, isTyping },
      });
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      localImages,
    }: {
      content: string;
      localImages?: string[];
    }) => {
      let imageUrls: string[] = [];

      // 1. Upload images if present
      if (localImages && localImages.length > 0) {
        try {
          const uploadPromises = localImages.map(async (uri) => {
            const manipulatedImage = await ImageManipulator.manipulateAsync(
              uri,
              [],
              {
                compress: 0.8,
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true,
              },
            );

            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
            const path = `chat_attachments/${userId}/${fileName}`;
            const arrayBuffer = decode(manipulatedImage.base64!);

            const { error: uploadError } = await supabase.storage
              .from("community")
              .upload(path, arrayBuffer, {
                cacheControl: "3600",
                upsert: true,
                contentType: "image/jpeg",
              });

            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
            } = supabase.storage.from("community").getPublicUrl(path);
            return publicUrl;
          });

          imageUrls = await Promise.all(uploadPromises);
        } catch (error) {
          console.error("Error uploading images in mutation:", error);
          throw error;
        }
      }

      // 2. Send message with remote URLs
      return messageApi.sendMessage({
        conversationId,
        content,
        images: imageUrls,
      });
    },
    onMutate: ({ content, localImages }) => {
      const tempId = `temp-${Date.now()}`;
      // Cancel refetches in background (don't await)
      queryClient.cancelQueries({
        queryKey: ["messages-v3", conversationId],
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData([
        "messages-v3",
        conversationId,
      ]);

      // Optimistically update IMMEDIATELY (0ms)
      queryClient.setQueryData(["messages-v3", conversationId], (old: any) => {
        const optimisticMessage = {
          id: tempId,
          content,
          image_urls: localImages || [], // Use local URIs for immediate display
          sender_id: userId,
          created_at: new Date().toISOString(),
          conversation_id: conversationId,
          is_read: false,
          sending: true, // Internal flag for UI feedback
        };

        if (!old || !old.pages || old.pages.length === 0) {
          return {
            pages: [
              {
                messages: [optimisticMessage],
                other_user: otherUser,
                pagination: { page: 1, limit: 10, hasMore: false },
              },
            ],
            pageParams: [1],
          };
        }

        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          messages: [optimisticMessage, ...newPages[0].messages],
        };
        return { ...old, pages: newPages };
      });

      return { previousData, tempId };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["messages-v3", conversationId],
          context.previousData,
        );
      }
    },
    onSuccess: (newMessage, variables, context) => {
      // Smoothly replace the temporary message with the real one
      queryClient.setQueryData(["messages-v3", conversationId], (old: any) => {
        if (!old || !old.pages) return old;

        const newPages = [...old.pages];
        if (newPages.length === 0) return old;

        const firstPage = { ...newPages[0] };

        // Attach local_urls to the real message so the UI can keep using the locally cached image
        // while the public URL starts loading. This eliminates the "flicker".
        const finalizedMessage = {
          ...newMessage.data,
          local_urls: variables.localImages,
        };

        // Replace ONLY the specific temp message from this mutation
        firstPage.messages = firstPage.messages.map((m: any) =>
          m.id === context?.tempId ? finalizedMessage : m,
        );

        newPages[0] = firstPage;
        return { ...old, pages: newPages };
      });

      // Still invalidate to ensure secondary lists (conversations) are fresh
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: () => messageApi.markAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      messageApi.updateMessage(id, content),
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({
        queryKey: ["messages-v3", conversationId],
      });
      const previousMessages = queryClient.getQueryData([
        "messages-v3",
        conversationId,
      ]);

      queryClient.setQueryData(["messages-v3", conversationId], (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: any) =>
              m.id === id ? { ...m, content, is_edited: true } : m,
            ),
          })),
        };
      });

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages-v3", conversationId],
          context.previousMessages,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages-v3", conversationId],
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => messageApi.deleteMessage(messageId),
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({
        queryKey: ["messages-v3", conversationId],
      });
      const previousMessages = queryClient.getQueryData([
        "messages-v3",
        conversationId,
      ]);

      queryClient.setQueryData(["messages-v3", conversationId], (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter((m: any) => m.id !== messageId),
          })),
        };
      });

      return { previousMessages };
    },
    onError: (err, messageId, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages-v3", conversationId],
          context.previousMessages,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages-v3", conversationId],
      });
    },
  });

  return {
    messages,
    otherUser,
    requestStatus,
    initiatedBy,
    loadingMessages,
    loadingMore,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
    sendMessage: sendMessageMutation.mutate,
    sendMessageAsync: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    markAsRead: markReadMutation.mutate,
    isOtherUserTyping,
    sendTypingStatus,
    updateMessage: updateMessageMutation.mutate,
    deleteMessage: deleteMessageMutation.mutate,
  };
}
