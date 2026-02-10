import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/NotificationItem";
import { EmptyState } from "@/components/EmptyState";
import type { Notification } from "@/types";

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  /** Navigate to the relevant screen based on notification type */
  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      if (!notification.is_read) {
        markAsRead(notification.id);
      }

      switch (notification.type) {
        case "follow":
          if (notification.actor_id) {
            router.push(`/creator/${notification.actor_id}`);
          }
          break;
        case "message":
          if (notification.data?.conversation_id) {
            router.push(`/chat/${notification.data.conversation_id}` as any);
          }
          break;
        case "community_join":
          if (notification.data?.community_id) {
            router.push(
              `/community-profile-edit?id=${notification.data.community_id}` as any,
            );
          }
          break;
        case "purchase":
          if (notification.data?.service_id) {
            router.push(
              `/service-detail?id=${notification.data.service_id}` as any,
            );
          }
          break;
        default:
          break;
      }
    },
    [markAsRead, router],
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Stack.Screen
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />

      {/* Instagram-style Header with back arrow */}
      <View className="px-4 pt-14 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center -ml-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-black ml-1">
              Notifications
            </Text>
          </View>
          {notifications.length > 0 && (
            <View className="flex-row items-center gap-3">
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={() => markAllAsRead()}
                  className="px-3 py-1.5 bg-gray-100 rounded-full"
                >
                  <Text className="text-xs font-semibold text-gray-700">
                    Read all
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => clearAll()}
                className="px-3 py-1.5 bg-red-50 rounded-full"
              >
                <Text className="text-xs font-semibold text-red-500">
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Text className="text-sm text-gray-500 mt-1 ml-9">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="No notifications yet"
          description="When someone follows you, messages you, or interacts with your content, you'll see it here."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={handleNotificationPress}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}
