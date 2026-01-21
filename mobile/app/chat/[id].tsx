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
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef, useEffect } from "react";
import { useChat, useMessaging } from "../../hooks/useMessaging";
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

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<{ uri: string }[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

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
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [message, isMeTyping, sendTypingStatus]);
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

  const uploadImages = async (uris: string[]) => {
    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const uri of uris) {
        // Convert HEIC/HEIF to JPEG using ImageManipulator
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          uri,
          [], // No transformations, just format conversion
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );

        const convertedUri = manipulatedImage.uri;
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const path = `chat_attachments/${user?.id}/${fileName}`;

        const formData = new FormData();
        formData.append("file", {
          uri: convertedUri,
          name: fileName,
          type: "image/jpeg",
        } as any);

        const { data, error } = await supabase.storage
          .from("community")
          .upload(path, formData, {
            cacheControl: "3600",
            upsert: true,
          });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from("community").getPublicUrl(path);

        uploadedUrls.push(publicUrl);
      }
      return uploadedUrls;
    } catch (error) {
      console.error("Error uploading images:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() && selectedImages.length === 0) return;

    let imageUrls: string[] = [];
    const currentImages = [...selectedImages];

    // Optimistically clear the UI states
    const currentMsg = message.trim();
    setMessage("");
    setSelectedImages([]);

    if (currentImages.length > 0) {
      try {
        imageUrls = await uploadImages(currentImages);
      } catch (error) {
        // Rollback on upload error?
        // For now just alert or log
        console.error("Failed to upload some images");
        return;
      }
    }

    sendMessage({ content: currentMsg, images: imageUrls });
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
                  } ${msg.image_urls && msg.image_urls.length >= 1 ? "bg-transparent px-0 py-0" : ""}`}
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
                          className="w-64 h-64 rounded-2xl overflow-hidden"
                        >
                          <Image
                            source={{ uri: msg.image_urls[0] }}
                            className="w-full h-full"
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
                                msg.image_urls.map((uri: string) => ({ uri })),
                              );
                              setViewerIndex(0);
                              setViewerVisible(true);
                            }}
                            activeOpacity={0.9}
                            className="relative w-52 h-64 items-center justify-center"
                          >
                            {/* Stacked cards - render bottom to top */}
                            {msg.image_urls
                              .slice(0, Math.min(msg.image_urls.length, 3))
                              .map((img: string, i: number) => {
                                const stackSize = Math.min(
                                  msg.image_urls.length,
                                  3,
                                );
                                // Reverse order: first item in array = bottom of stack
                                const stackIndex = stackSize - 1 - i;

                                // Rotation: back cards tilted, front card straight
                                const rotations = [-6, 6, 0];
                                const rotation = rotations[stackIndex] || 0;

                                // Vertical offset: back cards slightly higher
                                const yOffsets = [-16, -8, 0];
                                const yOffset = yOffsets[stackIndex] || 0;

                                // Horizontal offset for spread effect
                                const xOffsets = [-12, 12, 0];
                                const xOffset = xOffsets[stackIndex] || 0;

                                // Shadow intensity
                                const shadowOpacity =
                                  stackIndex === stackSize - 1 ? 0.25 : 0.15;
                                const isTopCard = stackIndex === stackSize - 1;

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
                                      source={{ uri: img }}
                                      className="w-full h-full"
                                      style={{ resizeMode: "cover" }}
                                    />
                                    {/* Gradient overlay on top card */}
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
                    <Text
                      className={`text-sm ${
                        isMe ? "text-white" : "text-black"
                      } font-medium leading-5 ${msg.image_urls && msg.image_urls.length > 1 ? "bg-black p-4 rounded-3xl self-center mt-4" : ""}`}
                    >
                      {msg.content}
                    </Text>
                  ) : null}
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
        {selectedImages.length > 0 && (
          <View className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex-row">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedImages.map((uri, index) => (
                <View key={index} className="mr-3 relative">
                  <Image
                    source={{ uri }}
                    className="w-20 h-20 rounded-xl border border-gray-200"
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

          <View className="flex-1 bg-gray-50 rounded-3xl px-4 py-2 flex-row items-end border border-gray-100">
            <TextInput
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              className="flex-1 text-black font-medium text-sm py-2 max-h-32"
              multiline
            />
            {isUploading && (
              <ActivityIndicator
                size="small"
                color="black"
                className="ml-2 mb-2"
              />
            )}
          </View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={
              (!message.trim() && selectedImages.length === 0) || isUploading
            }
            className={`ml-3 w-12 h-12 rounded-full items-center justify-center ${
              (!message.trim() && selectedImages.length === 0) || isUploading
                ? "bg-gray-100"
                : "bg-black"
            }`}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                (!message.trim() && selectedImages.length === 0) || isUploading
                  ? "#9CA3AF"
                  : "white"
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ImageViewer
        visible={viewerVisible}
        images={viewerImages.map((img) => img.uri)}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}
