import supabase from "../config/db.js";
import { logger } from "../config/logger.js";

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // 1. Get all conversation IDs the user is part of
    const { data: participations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (partError) throw partError;

    if (!participations || participations.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    // 2. Get details for these conversations and the OTHER participant
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select(
        `
        *,
        participants:conversation_participants(
          user:users(id, username, profile_image_url)
        ),
        last_message:messages(
          content,
          created_at,
          sender_id,
          image_urls
        )
      `,
      )
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false });

    if (convError) throw convError;

    // Get unread counts for all conversations in one query
    const { data: unreadCounts, error: unreadError } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .neq("sender_id", userId)
      .eq("is_read", false);

    if (unreadError) logger.error("Error counting unread:", unreadError);

    // Create a map of conversation_id -> unread count
    const unreadCountMap = (unreadCounts || []).reduce((acc, msg) => {
      acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1;
      return acc;
    }, {});

    // 3. Format data to return the "other" user, latest message, and unread count
    const formattedConversations = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p.user.id !== userId,
      );

      // Get the single latest message
      const lastMessage =
        conv.last_message && conv.last_message.length > 0
          ? conv.last_message.sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at),
            )[0]
          : null;

      return {
        id: conv.id,
        last_message_at: conv.last_message_at,
        other_user: otherParticipant?.user || null,
        last_message: lastMessage,
        unreadCount: unreadCountMap[conv.id] || 0,
      };
    });

    res.status(200).json({ success: true, data: formattedConversations });
  } catch (error) {
    logger.error("Error fetching conversations:", error);
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // 1. Get conversation details and participants to find the OTHER user
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(
        `
        *,
        participants:conversation_participants(
          user:users(id, username, profile_image_url)
        )
      `,
      )
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return res
        .status(404)
        .json({ success: false, error: "Conversation not found" });
    }

    // Verify participation
    const isParticipant = conversation.participants.some(
      (p) => p.user.id === userId,
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const otherParticipant = conversation.participants.find(
      (p) => p.user.id !== userId,
    );

    // 2. Get messages with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false }) // Newest first for easier pagination
      .range(from, to);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: {
        messages: messages || [],
        other_user: otherParticipant?.user || null,
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching messages:", error);
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, receiverId, content } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    let actualConversationId = conversationId;

    // 1. If no conversationId, check if one exists between these two users
    if (!actualConversationId && receiverId) {
      const { data: existing, error: searchError } = await supabase.rpc(
        "get_or_create_conversation",
        {
          p_user1: senderId,
          p_user2: receiverId,
        },
      );

      if (searchError) throw searchError;
      actualConversationId = existing;
    }

    if (!actualConversationId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing conversation details" });
    }

    // 2. Insert the message
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: actualConversationId,
        sender_id: senderId,
        content,
        image_urls: req.body.images || [], // Use existing image_urls column
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // 3. BROADCAST FALLBACK: Explicitly notify the other user via Realtime
    // This ensures delivery even if CDC is lagging.
    try {
      await supabase.channel(`chat_room_${actualConversationId}`).send({
        type: "broadcast",
        event: "message",
        payload: message,
      });
    } catch (broadcastError) {
      logger.error("Broadcast to chat room failed:", broadcastError);
      // Non-fatal: message is saved, CDC will eventually deliver
    }

    // 4. SYSTEM-WIDE NOTIFICATION: Notify the recipient on their personal channel
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", actualConversationId)
      .neq("user_id", senderId)
      .single();

    if (participants?.user_id) {
      await supabase.channel(`notifications:${participants.user_id}`).send({
        type: "broadcast",
        event: "new_message",
        payload: {
          conversationId: actualConversationId,
          senderId,
          content: message.content,
        },
      });
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    logger.error("Error sending message:", error);
    next(error);
  }
};

export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user?.id;

    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        error: "Sender and receiver IDs are required",
      });
    }

    // Call the RPC function we created in the migration
    const { data: conversationId, error } = await supabase.rpc(
      "get_or_create_conversation",
      {
        p_user1: senderId,
        p_user2: receiverId,
      },
    );

    if (error) {
      logger.error("RPC Error in getOrCreateConversation:", error);
      throw error;
    }

    res.status(200).json({
      success: true,
      data: { conversationId },
    });
  } catch (error) {
    logger.error("Error in getOrCreateConversation:", error);
    next(error);
  }
};
export const markAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Verify user is a participant
    const { data: participation, error: partError } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .single();

    if (partError || !participation) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    // Update all messages in this conversation where the user is NOT the sender
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    // BROADCAST FALLBACK: Notify the chat room
    await supabase.channel(`chat_room_${conversationId}`).send({
      type: "broadcast",
      event: "read",
      payload: { conversationId, readerId: userId },
    });

    // SYSTEM-WIDE NOTIFICATION: Notify the other participant
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", userId)
      .single();

    if (participants?.user_id) {
      await supabase.channel(`notifications:${participants.user_id}`).send({
        type: "broadcast",
        event: "read_notification",
        payload: { conversationId, readerId: userId },
      });
    }

    res.status(200).json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    logger.error("Error marking messages as read:", error);
    next(error);
  }
};

export const updateMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("messages")
      .update({ content: content.trim(), is_edited: true })
      .eq("id", id)
      .eq("sender_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Message not found or not authorized",
        });
      }
      throw error;
    }

    // Broadcast the update so other users see it immediately
    try {
      await supabase.channel(`chat_room_${data.conversation_id}`).send({
        type: "broadcast",
        event: "message_update",
        payload: data,
      });
    } catch (e) {
      logger.error("Broadcast update failed:", e);
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // 1. Get message info FIRST so we know which conversation to broadcast to
    const { data: msgInfo } = await supabase
      .from("messages")
      .select("conversation_id")
      .eq("id", id)
      .single();

    // 2. Perform the deletion
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", id)
      .eq("sender_id", userId);

    if (error) {
      throw error;
    }

    // 3. Broadcast the deletion
    if (msgInfo?.conversation_id) {
      try {
        await supabase.channel(`chat_room_${msgInfo.conversation_id}`).send({
          type: "broadcast",
          event: "message_delete",
          payload: { id },
        });
      } catch (e) {
        logger.error("Broadcast delete failed:", e);
      }
    }

    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    next(error);
  }
};
