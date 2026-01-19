import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { messageApi } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthState } from "./useAuthState";

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

export function useChat(conversationId: string, userId?: string) {
  const queryClient = useQueryClient();
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  // Fetch messages and conversation details for a specific conversation
  const {
    data,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await messageApi.getMessages(conversationId);
      return res.data; // Now returns { messages, other_user }
    },
    enabled: !!conversationId,
    staleTime: 0, // Always fetch latest messages on entry
  });

  const messages = data?.messages || [];
  const otherUser = data?.other_user || null;

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channelName = `chat_room_${conversationId}`;
    const handleNewMessage = (record: any) => {
      queryClient.setQueryData(["messages", conversationId], (old: any) => {
        if (!old) return { messages: [record], other_user: null };
        if (old.messages.some((m: any) => m.id === record.id)) return old;

        const filteredMessages =
          record.sender_id === userId
            ? old.messages.filter(
                (m: any) => !m.id.toString().startsWith("temp-"),
              )
            : old.messages;

        return { ...old, messages: [...filteredMessages, record] };
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleUpdateMessage = (record: any) => {
      queryClient.setQueryData(["messages", conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m: any) =>
            m.id === record.id ? { ...m, ...record } : m,
          ),
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

          console.log(`🔥 [CDC] ${payload.eventType}`, record.id);
          if (payload.eventType === "INSERT") handleNewMessage(record);
          else if (payload.eventType === "UPDATE") handleUpdateMessage(record);
        },
      )
      .on("broadcast", { event: "message" }, ({ payload }) => {
        console.log(`🔥 [Broadcast] Message:`, payload.id);
        handleNewMessage(payload);
      })
      .on("broadcast", { event: "read" }, ({ payload }) => {
        console.log(`🔥 [Broadcast] Read:`, payload.conversationId);
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== userId) {
          setIsOtherUserTyping(payload.isTyping);

          // Auto-clear typing status after 3 seconds of no updates
          if (payload.isTyping) {
            if (typingTimeoutRef.current)
              clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsOtherUserTyping(false);
            }, 3000);
          }
        }
      })
      .subscribe((status) => {
        console.log(`🔌 Channel [${channelName}] status:`, status);
      });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, userId]);

  const sendTypingStatus = (isTyping: boolean) => {
    if (!conversationId) return;

    // Broadcast to room
    supabase.channel(`chat_room_${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId, isTyping },
    });

    // Broadcast to other user's global notification channel
    if (otherUser?.id) {
      supabase.channel(`notifications:${otherUser.id}`).send({
        type: "broadcast",
        event: "typing",
        payload: { conversationId, userId, isTyping },
      });
    }
  };

  // Mutation to send a message with optimistic update
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      messageApi.sendMessage({ conversationId, content }),
    onMutate: async (content) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["messages", conversationId],
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData([
        "messages",
        conversationId,
      ]);

      // Optimistically update
      queryClient.setQueryData(["messages", conversationId], (old: any) => {
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          content,
          sender_id: userId,
          created_at: new Date().toISOString(),
          conversation_id: conversationId,
          is_read: false,
        };
        if (!old) return { messages: [optimisticMessage], other_user: null };
        return {
          ...old,
          messages: [...(old.messages || []), optimisticMessage],
        };
      });

      return { previousData };
    },
    onError: (err, content, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["messages", conversationId],
          context.previousData,
        );
      }
    },
    onSuccess: () => {
      // Refetch to get the real message with correct ID
      // This will clean up the temp optimistic message and sync with the database
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Mutation to mark messages as read
  const markReadMutation = useMutation({
    mutationFn: () => messageApi.markAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    messages,
    otherUser,
    loadingMessages,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markReadMutation.mutate,
    isOtherUserTyping,
    sendTypingStatus,
  };
}
