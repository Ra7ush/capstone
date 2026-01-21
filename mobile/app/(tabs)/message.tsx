import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef } from "react";
import { useMessaging } from "../../hooks/useMessaging";
import { usePresence } from "../../hooks/usePresence";
import { profileApi, messageApi } from "../../lib/api";

function SearchModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }

    console.log(`[Frontend] Searching for: "${text}"`);
    setLoading(true);
    try {
      const data = await profileApi.searchProfiles(text);
      console.log(`[Frontend] Found ${data?.length || 0} results`);
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (userId: string) => {
    setStartingChat(userId);
    try {
      const res = await messageApi.getOrCreateConversation(userId);
      const conversationId = res.data.conversationId;
      onClose();
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversationId },
      } as any);
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-start pt-[20%] px-6">
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="absolute inset-0" />
        </TouchableWithoutFeedback>

        <View
          className="w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
          style={{ maxHeight: "60%" }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              {/* Search Bar */}
              <View className="px-4 py-4 border-b border-gray-100 flex-row items-center">
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Who are you looking for?"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-3 text-black font-semibold text-base"
                  value={search}
                  onChangeText={handleSearch}
                  autoFocus
                  autoCapitalize="none"
                />
                {loading && <ActivityIndicator size="small" color="#000" />}
                <TouchableOpacity onPress={onClose} className="ml-2 p-1">
                  <Ionicons name="close-circle" size={22} color="#D1D5DB" />
                </TouchableOpacity>
              </View>

              <ScrollView
                className="w-full"
                showsVerticalScrollIndicator={false}
              >
                <View className="px-2 py-2">
                  {results.length > 0 ? (
                    results.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        className="flex-row items-center p-3 rounded-2xl active:bg-gray-50 mb-1"
                        onPress={() => startChat(user.id)}
                        disabled={!!startingChat}
                      >
                        <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center overflow-hidden">
                          {user.profile_image_url ? (
                            <Image
                              source={{ uri: user.profile_image_url }}
                              className="w-full h-full"
                            />
                          ) : (
                            <Text className="text-black font-black text-base">
                              {user.username?.slice(0, 1).toUpperCase() || "?"}
                            </Text>
                          )}
                        </View>
                        <View className="flex-1 ml-4">
                          <Text className="text-black font-bold text-base">
                            {user.username}
                          </Text>
                          <Text className="text-gray-400 text-xs">
                            {user.full_name}
                          </Text>
                        </View>
                        {startingChat === user.id ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#D1D5DB"
                          />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View className="items-center justify-center py-10">
                      {search.length < 2 ? (
                        <Text className="text-gray-300 font-bold">
                          Start typing to search
                        </Text>
                      ) : (
                        !loading && (
                          <Text className="text-gray-400 font-bold">
                            No users found for "{search}"
                          </Text>
                        )
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    </Modal>
  );
}

export default function Message() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const {
    conversations,
    loadingConversations,
    refetchConversations,
    typingStates,
  } = useMessaging();
  const { isUserOnline } = usePresence();

  const filteredMessages =
    conversations?.filter(
      (conv: any) =>
        conv.other_user?.username
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        conv.last_message?.content
          ?.toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];

  const getInitials = (name: string) => {
    return name?.slice(0, 2).toUpperCase() || "??";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return "now";

      const minutes = Math.floor(diffInSeconds / 60);
      if (minutes < 60) return `${minutes}m`;

      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h`;

      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d`;

      const weeks = Math.floor(days / 7);
      return `${weeks}w`;
    } catch (e) {
      return "";
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-14 pb-2 bg-white flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-[22px] font-black text-black">Messages</Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color="black"
            className="ml-1 mt-1"
          />
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity className="mr-5">
            <Ionicons name="videocam-outline" size={28} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSearchVisible(true)}>
            <Ionicons name="create-outline" size={28} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-5 py-2">
        <View className="bg-[#EFEFEF] flex-row items-center px-4 py-2 rounded-xl">
          <Ionicons name="search" size={18} color="#8E8E8E" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#8E8E8E"
            className="flex-1 ml-3 text-black font-medium text-[16px]"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingConversations}
            onRefresh={refetchConversations}
          />
        }
      >
        <View className="px-5 py-4">
          {filteredMessages.map((conv: any) => (
            <TouchableOpacity
              key={conv.id}
              className="flex-row items-center mb-5"
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: conv.id },
                } as any)
              }
            >
              <View className="relative">
                <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center border border-gray-100 overflow-hidden">
                  {conv.other_user?.profile_image_url ? (
                    <Image
                      source={{ uri: conv.other_user.profile_image_url }}
                      className="w-full h-full"
                    />
                  ) : (
                    <Text className="text-lg text-black font-black">
                      {getInitials(conv.other_user?.username || "??")}
                    </Text>
                  )}
                </View>
                {isUserOnline(conv.other_user?.id) && (
                  <View className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-white items-center justify-center">
                    <View className="w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  </View>
                )}
              </View>
              <View className="flex-1 ml-4 justify-center">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[16px] font-black text-black">
                    {conv.other_user?.username}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text
                    className={`flex-1 text-[14px] ${
                      typingStates[conv.id]
                        ? "text-[#FF4D00] font-black italic"
                        : conv.unreadCount > 0
                          ? "text-black font-black"
                          : "text-[#8E8E8E] font-medium"
                    }`}
                    numberOfLines={1}
                  >
                    {typingStates[conv.id]
                      ? "Typing..."
                      : conv.last_message?.content ||
                        (conv.last_message?.image_urls?.length > 0
                          ? "Sent a photo"
                          : "Sent a message")}
                  </Text>
                  <Text className="text-[#8E8E8E] text-[13px] ml-1">
                    • {formatDate(conv.last_message_at)}
                  </Text>
                </View>
              </View>
              {conv.unreadCount > 0 && (
                <View className="flex-row items-center ml-2">
                  <View className="bg-[#FF4D00] px-1.5 py-0.5 rounded-full mr-1">
                    <Text className="text-white text-[9px] font-black">
                      NEW
                    </Text>
                  </View>
                  <View className="w-2.5 h-2.5 rounded-full bg-[#FF4D00]" />
                </View>
              )}
            </TouchableOpacity>
          ))}

          {!loadingConversations && filteredMessages.length === 0 && (
            <View className="items-center justify-center py-20">
              <Text className="text-gray-400 font-bold">No messages</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SearchModal
        visible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
      />
    </View>
  );
}
