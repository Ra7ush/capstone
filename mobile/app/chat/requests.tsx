import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useMessageRequests } from "@/hooks/useMessaging";

export default function MessageRequests() {
  const router = useRouter();
  const {
    requests,
    loadingRequests,
    refetchRequests,
    acceptRequest,
    declineRequest,
    isAccepting,
    isDeclining,
  } = useMessageRequests();

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
    } catch {
      return "";
    }
  };

  const [actionId, setActionId] = useState<string | null>(null);

  const handleAccept = async (conversationId: string) => {
    setActionId(conversationId);
    try {
      await acceptRequest(conversationId);
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversationId },
      } as any);
    } catch (error) {
      console.error("Error accepting request:", error);
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = (conversationId: string, username: string) => {
    Alert.alert(
      "Decline Request",
      `Are you sure you want to decline the message request from @${username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              await declineRequest(conversationId);
            } catch (error) {
              console.error("Error declining request:", error);
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerTitle: "Message Requests",
          headerStyle: { backgroundColor: "white" },
          headerTintColor: "black",
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "800" },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />
      <StatusBar style="dark" />

      {/* Info Banner */}
      <View className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <Text className="text-gray-500 text-[13px] font-medium leading-5">
          These are messages from people you don&apos;t follow. They won&apos;t
          know you&apos;ve seen their request until you accept it.
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingRequests}
            onRefresh={refetchRequests}
          />
        }
      >
        <View className="px-5 py-4">
          {requests.map((conv: any) => (
            <View
              key={conv.id}
              className="mb-5 border border-gray-100 rounded-2xl p-4"
            >
              {/* User Info Row */}
              <TouchableOpacity
                className="flex-row items-center mb-3"
                onPress={() =>
                  router.push({
                    pathname: "/user-profile",
                    params: { userId: conv.other_user?.id },
                  } as any)
                }
              >
                <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center overflow-hidden">
                  {conv.other_user?.profile_image_url ? (
                    <Image
                      source={{ uri: conv.other_user.profile_image_url }}
                      className="w-full h-full"
                    />
                  ) : (
                    <Text className="text-black font-black text-base">
                      {getInitials(conv.other_user?.username || "??")}
                    </Text>
                  )}
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[15px] font-black text-black">
                    {conv.other_user?.username}
                  </Text>
                  <Text className="text-gray-400 text-xs font-medium">
                    {formatDate(conv.last_message_at)}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Message Preview */}
              <View className="bg-gray-50 rounded-xl px-4 py-3 mb-3">
                <Text
                  className="text-gray-600 text-[14px] font-medium"
                  numberOfLines={3}
                >
                  {conv.last_message?.content ||
                    (conv.last_message?.image_urls?.length > 0
                      ? "📷 Sent a photo"
                      : "Sent a message")}
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-black rounded-xl py-3 items-center"
                  onPress={() => handleAccept(conv.id)}
                  disabled={actionId === conv.id}
                >
                  {isAccepting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-black text-[14px]">
                      Accept
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-gray-100 rounded-xl py-3 items-center"
                  onPress={() =>
                    handleDecline(
                      conv.id,
                      conv.other_user?.username || "this user",
                    )
                  }
                  disabled={actionId === conv.id}
                >
                  {isDeclining ? (
                    <ActivityIndicator size="small" color="black" />
                  ) : (
                    <Text className="text-black font-black text-[14px]">
                      Decline
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {!loadingRequests && requests.length === 0 && (
            <View className="items-center justify-center py-20">
              <Ionicons name="mail-open-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 font-bold mt-4">
                No message requests
              </Text>
              <Text className="text-gray-300 text-sm mt-1">
                You&apos;re all caught up!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
