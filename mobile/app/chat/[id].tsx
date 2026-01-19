import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef, useEffect } from "react";
import { useChat, useMessaging } from "../../hooks/useMessaging";
import { useAuthState } from "../../hooks/useAuthState";
import { usePresence } from "../../hooks/usePresence";

export default function ChatDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const { user } = useAuthState();
  const {
    messages,
    otherUser,
    loadingMessages,
    sendMessage,
    isSending,
    markAsRead,
    isOtherUserTyping,
    sendTypingStatus,
  } = useChat(id, user?.id);
  const [isMeTyping, setIsMeTyping] = useState(false);
  const typingTimerRef = useRef<any>(null);
  const { isUserOnline } = usePresence();
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  const isOnline = otherUser?.id ? isUserOnline(otherUser.id) : false;

  // Send typing status when message changes
  useEffect(() => {
    if (message.length > 0 && !isMeTyping) {
      setIsMeTyping(true);
      sendTypingStatus(true);
    }

    if (message.length === 0 && isMeTyping) {
      setIsMeTyping(false);
      sendTypingStatus(false);
    }

    if (message.length > 0) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setIsMeTyping(false);
        sendTypingStatus(false);
      }, 3000);
    }
  }, [message]);

  useEffect(() => {
    if (messages.length > 0 || isOtherUserTyping) {
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );

      // Mark as read if any messages are unread AND were sent by the other user
      const hasUnread = messages.some(
        (m: any) => !m.is_read && m.sender_id !== user?.id,
      );
      if (hasUnread) {
        markAsRead();
      }
    }
  }, [messages, isOtherUserTyping, user?.id]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage(message.trim());
    setMessage("");
  };

  const getInitials = (name: string) => {
    return name?.slice(0, 2).toUpperCase() || "??";
  };

  const formatChatTime = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    const isRecent = date > oneWeekAgo;

    const timeStr = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return timeStr;
    if (isYesterday) return `YESTERDAY, ${timeStr}`;
    if (isRecent)
      return `${date.toLocaleDateString([], { weekday: "short" }).toUpperCase()}, ${timeStr}`;

    return `${date.toLocaleDateString([], { month: "short", day: "numeric" }).toUpperCase()}, ${timeStr}`;
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerTitle: "",
          headerStyle: { backgroundColor: "white" },
          headerLeft: () => (
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => router.back()} className="mr-4">
                <Ionicons name="arrow-back" size={24} color="black" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center">
                <View className="relative">
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3 overflow-hidden border-2 border-[#FF4D00]">
                    {otherUser?.profile_image_url ? (
                      <Image
                        source={{ uri: otherUser.profile_image_url }}
                        className="w-full h-full"
                      />
                    ) : (
                      <Text className="text-black font-black text-xs">
                        {getInitials(otherUser?.username || "??")}
                      </Text>
                    )}
                  </View>
                  {isOnline && (
                    <View className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </View>
                <View>
                  <Text className="text-black font-black text-base">
                    {otherUser?.username || "Loading..."}
                  </Text>
                  <Text
                    className={`text-[10px] font-bold ${isOnline ? "text-green-500" : "text-gray-400"}`}
                  >
                    {isOnline ? "Active now" : "Offline"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ),
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
      >
        {loadingMessages && messages.length === 0 && (
          <View className="py-20">
            <ActivityIndicator color="#000" />
          </View>
        )}

        {messages.map((msg: any, index: number) => {
          const isMe = msg.sender_id === user?.id;
          const showFullTime =
            index === 0 ||
            new Date(messages[index - 1].created_at).getTime() <
              new Date(msg.created_at).getTime() - 1000 * 60 * 60; // 1 hour threshold

          return (
            <View key={msg.id}>
              {showFullTime && (
                <View className="items-center my-8">
                  <Text className="text-[11px] text-gray-400 font-black uppercase tracking-[1.5px]">
                    {formatChatTime(new Date(msg.created_at))}
                  </Text>
                </View>
              )}
              <View
                className={`mb-2 max-w-[80%] ${
                  isMe ? "self-end" : "self-start flex-row items-end"
                }`}
              >
                {!isMe && (
                  <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2 mb-1 overflow-hidden">
                    {otherUser?.profile_image_url ? (
                      <Image
                        source={{ uri: otherUser.profile_image_url }}
                        className="w-full h-full"
                      />
                    ) : (
                      <Text className="text-[9px] text-black font-black">
                        {getInitials(otherUser?.username || "??")}
                      </Text>
                    )}
                  </View>
                )}
                <View
                  className={`px-4 py-3 ${
                    isMe
                      ? "bg-black rounded-t-3xl rounded-bl-3xl"
                      : "bg-gray-100 rounded-t-3xl rounded-br-3xl"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isMe ? "text-white" : "text-black"
                    } font-medium leading-5`}
                  >
                    {msg.content}
                  </Text>
                </View>
              </View>
              {index === messages.length - 1 && isMe && (
                <Text className="text-[9px] text-gray-400 self-end mt-0.5 font-bold mr-2">
                  {msg.is_read ? "Seen" : "Sent"}
                </Text>
              )}
            </View>
          );
        })}

        {isOtherUserTyping && (
          <View className="flex-row items-end mb-4 self-start">
            <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2 mb-1 overflow-hidden">
              {otherUser?.profile_image_url ? (
                <Image
                  source={{ uri: otherUser.profile_image_url }}
                  className="w-full h-full"
                />
              ) : (
                <Text className="text-[9px] text-black font-black">
                  {getInitials(otherUser?.username || "??")}
                </Text>
              )}
            </View>
            <View className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-none">
              <View className="flex-row items-center space-x-1">
                <View className="w-1.5 h-1.5 bg-gray-400 rounded-full opacity-60" />
                <View className="w-1.5 h-1.5 bg-gray-400 rounded-full opacity-70" />
                <View className="w-1.5 h-1.5 bg-gray-400 rounded-full opacity-80" />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View className="px-4 pt-2 pb-8 bg-white border-t border-gray-100 flex-row items-end">
          <View className="flex-1 bg-gray-50 rounded-3xl px-4 py-2 flex-row items-end border border-gray-100">
            <TextInput
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              className="flex-1 text-black font-medium text-sm py-2 max-h-32"
              multiline
            />
          </View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim()}
            className={`ml-3 w-12 h-12 rounded-full items-center justify-center ${
              !message.trim() ? "bg-gray-100" : "bg-black"
            }`}
          >
            <Ionicons
              name="send"
              size={20}
              color={message.trim() ? "white" : "#9CA3AF"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
