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
  Dimensions,
  FlatList,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef, useEffect } from "react";
import { useChat, useMessageRequests } from "../../hooks/useMessaging";
import { useAuthState } from "../../hooks/useAuthState";
import { usePresence } from "../../hooks/usePresence";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";
import { Image as ExpoImage } from "expo-image";
import { decode } from "base64-arraybuffer";
import { ImageViewer } from "../../components/ImageViewer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ChatDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const { user } = useAuthState();
  const {
    messages,
    otherUser,
    requestStatus,
    initiatedBy,
    loadingMessages,
    loadingMore,
    loadMore,
    hasMore,
    sendMessage,
    isSending,
    markAsRead,
    isOtherUserTyping,
    sendTypingStatus,
    updateMessage,
    deleteMessage,
  } = useChat(id!, user?.id);
  const { acceptRequest, declineRequest, isAccepting, isDeclining } =
    useMessageRequests();
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [isMeTyping, setIsMeTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimerRef = useRef<any>(null);
  const { isUserOnline } = usePresence();
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<{ uri: string }[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const isOnline = otherUser?.id ? isUserOnline(otherUser.id) : false;

  // Message request state
  const isPendingRequest = requestStatus === "pending";
  const isRecipient = isPendingRequest && initiatedBy !== user?.id;
  const isRequester = isPendingRequest && initiatedBy === user?.id;
  const canSendMessage = !isPendingRequest || isRequester;

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
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [message, isMeTyping, sendTypingStatus]);
  useEffect(() => {
    // Mark as read if any messages are unread AND were sent by the other user
    const hasUnread = messages.some(
      (m: any) => !m.is_read && m.sender_id !== user?.id,
    );
    if (hasUnread) {
      markAsRead();
    }
  }, [messages, user?.id]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5 - selectedImages.length,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      // Ensure we don't exceed 5 total
      setSelectedImages((prev) => [...prev, ...newImages].slice(0, 5));
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current) {
      // Since the list is inverted, bottom is offset 0
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleSend = async () => {
    if (!message.trim() && selectedImages.length === 0) return;

    const currentMsg = message.trim();
    const currentImages = [...selectedImages];

    if (editingMessage) {
      try {
        updateMessage({ id: editingMessage.id, content: currentMsg });
        handleCancelEdit();
      } catch (error) {
        console.error("Failed to update message:", error);
      }
      return;
    }

    // Optimistically clear immediately
    setMessage("");
    setSelectedImages([]);

    try {
      // Trigger mutation with local images for instant feedback
      sendMessage({ content: currentMsg, localImages: currentImages });

      // After a small delay to allow the optimistic message to render, scroll to bottom
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleLongPress = (msg: any) => {
    if (msg.sender_id !== user?.id) return;

    const options = [];

    // Only allow editing if there are no images
    if (!msg.image_urls || msg.image_urls.length === 0) {
      options.push({
        text: "Edit",
        onPress: () => {
          setEditingMessage(msg);
          setMessage(msg.content);
          // Small timeout to allow the focus to work after state change
          setTimeout(() => inputRef.current?.focus(), 100);
        },
      });
    }

    options.push({
      text: "Delete",
      style: "destructive" as const,
      onPress: () => {
        Alert.alert(
          "Delete Message",
          "Are you sure you want to delete this message?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => deleteMessage(msg.id),
            },
          ],
        );
      },
    });

    options.push({ text: "Cancel", style: "cancel" as const });

    Alert.alert("Message Options", undefined, options);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
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

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 10 }}
        ListFooterComponent={
          (loadingMessages && messages.length === 0) || loadingMore ? (
            <View className="py-8">
              <ActivityIndicator color="#000" />
            </View>
          ) : null
        }
        onEndReached={() => {
          if (!loadingMore && hasMore) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          isOtherUserTyping ? (
            <View className="flex-row items-end mb-4 self-start">
              <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2 mb-1 overflow-hidden">
                {otherUser?.profile_image_url ? (
                  <Image
                    source={{ uri: otherUser.profile_image_url }}
                    className="w-full h-full"
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
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
          ) : null
        }
        renderItem={({ item: msg, index }) => {
          const isMe = msg.sender_id === user?.id;
          const showFullTime =
            index === messages.length - 1 ||
            new Date(messages[index + 1]?.created_at).getTime() <
              new Date(msg.created_at).getTime() - 1000 * 60 * 60;

          return (
            <View>
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
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-[9px] text-black font-black">
                        {getInitials(otherUser?.username || "??")}
                      </Text>
                    )}
                  </View>
                )}
                <View
                  className={`max-w-full ${isMe ? "self-end" : "self-start"}`}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onLongPress={() => handleLongPress(msg)}
                    className={`${
                      isMe
                        ? "bg-black rounded-t-3xl rounded-bl-3xl"
                        : "bg-gray-100 rounded-t-3xl rounded-br-3xl"
                    } ${msg.image_urls && msg.image_urls.length >= 1 ? "bg-transparent px-0 py-0" : "px-4 py-3"}`}
                  >
                    {msg.image_urls && msg.image_urls.length > 0 && (
                      <View className="mb-2">
                        {msg.image_urls.length === 1 ? (
                          <TouchableOpacity
                            onPress={() => {
                              setViewerImages([{ uri: msg.image_urls[0] }]);
                              setViewerIndex(0);
                              setViewerVisible(true);
                            }}
                            onLongPress={() => handleLongPress(msg)}
                            className="w-64 h-64 rounded-2xl overflow-hidden"
                          >
                            <Image
                              source={{
                                uri: msg.local_urls?.[0] || msg.image_urls[0],
                              }}
                              className="w-full h-full"
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : (
                          <View className="items-center py-2">
                            <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                              sent {msg.image_urls.length} photos
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setViewerImages(
                                  msg.image_urls.map((uri: string) => ({
                                    uri,
                                  })),
                                );
                                setViewerIndex(0);
                                setViewerVisible(true);
                              }}
                              onLongPress={() => handleLongPress(msg)}
                              activeOpacity={0.9}
                              className="relative w-52 h-64 items-center justify-center"
                            >
                              {msg.image_urls
                                .slice(0, Math.min(msg.image_urls.length, 3))
                                .map((img: string, i: number) => {
                                  const stackSize = Math.min(
                                    msg.image_urls.length,
                                    3,
                                  );
                                  const stackIndex = stackSize - 1 - i;
                                  const rotations = [-6, 6, 0];
                                  const rotation = rotations[stackIndex] || 0;
                                  const yOffsets = [-16, -8, 0];
                                  const yOffset = yOffsets[stackIndex] || 0;
                                  const xOffsets = [-12, 12, 0];
                                  const xOffset = xOffsets[stackIndex] || 0;
                                  const shadowOpacity =
                                    stackIndex === stackSize - 1 ? 0.25 : 0.15;
                                  const isTopCard =
                                    stackIndex === stackSize - 1;

                                  return (
                                    <View
                                      key={i}
                                      className="absolute w-44 h-56 rounded-3xl overflow-hidden"
                                      style={{
                                        transform: [
                                          { rotate: `${rotation}deg` },
                                          { translateY: yOffset },
                                          { translateX: xOffset },
                                        ],
                                        zIndex: stackIndex,
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: shadowOpacity,
                                        shadowRadius: 16,
                                        elevation: 8 + stackIndex * 2,
                                        backgroundColor: "#fff",
                                      }}
                                    >
                                      <Image
                                        source={{
                                          uri: msg.local_urls?.[i] || img,
                                        }}
                                        className="w-full h-full"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                        }}
                                        resizeMode="cover"
                                      />
                                      {isTopCard && (
                                        <View
                                          className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
                                          style={{
                                            backgroundColor: "rgba(0,0,0,0.05)",
                                          }}
                                        />
                                      )}
                                    </View>
                                  );
                                })}
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                    {msg.content ? (
                      <View
                        className={`${msg.image_urls && msg.image_urls.length > 1 ? "bg-black p-4 rounded-3xl self-center mt-4" : ""}`}
                      >
                        <Text
                          className={`text-sm ${
                            isMe ? "text-white" : "text-black"
                          } font-medium leading-5`}
                        >
                          {msg.content}
                        </Text>
                        {msg.is_edited && (
                          <Text
                            className={`text-[8px] font-bold mt-1 ${isMe ? "text-gray-400" : "text-gray-500"}`}
                          >
                            edited
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>
              {isMe && index === 0 && (
                <Text className="text-[9px] text-gray-400 self-end mt-0.5 font-bold mr-2">
                  {msg.is_read ? "Seen" : "Sent"}
                </Text>
              )}
            </View>
          );
        }}
      />

      {/* Message Request Banner - shown to recipient of pending request */}
      {isRecipient && (
        <View className="border-t border-gray-100 bg-white">
          <View className="px-5 py-4">
            <View className="bg-blue-50 rounded-2xl px-4 py-3 mb-3">
              <Text className="text-blue-800 text-[13px] font-semibold leading-5 text-center">
                <Text className="font-black">
                  @{otherUser?.username || "This user"}
                </Text>{" "}
                wants to send you a message. Accept to start chatting or decline
                to remove this request.
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-black rounded-xl py-3.5 items-center"
                onPress={async () => {
                  try {
                    await acceptRequest(id!);
                  } catch (error) {
                    console.error("Error accepting request:", error);
                  }
                }}
                disabled={isAccepting || isDeclining}
              >
                {isAccepting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-black text-[15px]">
                    Accept
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-gray-100 rounded-xl py-3.5 items-center"
                onPress={async () => {
                  try {
                    await declineRequest(id!);
                    router.back();
                  } catch (error) {
                    console.error("Error declining request:", error);
                  }
                }}
                disabled={isAccepting || isDeclining}
              >
                {isDeclining ? (
                  <ActivityIndicator size="small" color="black" />
                ) : (
                  <Text className="text-black font-black text-[15px]">
                    Decline
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Pending request notice for the sender */}
      {isRequester && (
        <View className="border-t border-gray-100 bg-white px-5 py-3">
          <Text className="text-gray-400 text-[12px] font-semibold text-center">
            <Ionicons name="time-outline" size={12} color="#9CA3AF" /> Your
            message request is pending. You can send messages, but{" "}
            <Text className="font-black">@{otherUser?.username || "they"}</Text>{" "}
            must accept before they can reply.
          </Text>
        </View>
      )}

      {/* Regular message input - shown when conversation is accepted or user is the requester */}
      {canSendMessage && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {selectedImages.length > 0 && (
            <View className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex-row">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedImages.map((uri, index) => (
                  <View key={index} className="mr-3 relative">
                    <Image
                      source={{ uri }}
                      className="w-20 h-20 rounded-xl border border-gray-200"
                      style={{ width: 80, height: 80 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedImages((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100"
                    >
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View className="px-4 pt-2 pb-8 bg-white border-t border-gray-100 flex-row items-end">
            <TouchableOpacity
              onPress={pickImages}
              className="w-10 h-10 items-center justify-center mr-2 bg-gray-50 rounded-full"
            >
              <Ionicons name="image" size={22} color="#4B5563" />
            </TouchableOpacity>

            <View className="flex-1 bg-gray-50 rounded-3xl px-4 py-2 flex-row items-center border border-gray-100">
              <TextInput
                ref={inputRef}
                placeholder={
                  editingMessage ? "Edit message..." : "Type a message..."
                }
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={setMessage}
                className="flex-1 text-black font-medium text-sm py-2 max-h-32"
                multiline
              />
              {editingMessage && (
                <TouchableOpacity onPress={handleCancelEdit} className="ml-2">
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!message.trim() && selectedImages.length === 0}
              className={`ml-3 w-12 h-12 rounded-full items-center justify-center ${
                !message.trim() && selectedImages.length === 0
                  ? "bg-gray-100"
                  : "bg-black"
              }`}
            >
              <Ionicons
                name={editingMessage ? "checkmark-circle" : "send"}
                size={editingMessage ? 28 : 20}
                color={
                  !message.trim() && selectedImages.length === 0
                    ? "#9CA3AF"
                    : editingMessage
                      ? "#FF4D00"
                      : "white"
                }
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <ImageViewer
        visible={viewerVisible}
        images={viewerImages.map((img) => img.uri)}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}
