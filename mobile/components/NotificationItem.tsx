import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Notification, NotificationType } from "@/types";

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onDelete?: (id: string) => void;
}

/** Icon & color config per notification type */
const NOTIFICATION_CONFIG: Record<
  NotificationType,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }
> = {
  follow: { icon: "person-add", color: "#3B82F6", bgColor: "#EFF6FF" },
  message: { icon: "chatbubble", color: "#8B5CF6", bgColor: "#F5F3FF" },
  community_join: { icon: "people", color: "#10B981", bgColor: "#ECFDF5" },
  purchase: { icon: "cart", color: "#F59E0B", bgColor: "#FFFBEB" },
  like: { icon: "heart", color: "#EF4444", bgColor: "#FEF2F2" },
  comment: { icon: "chatbox", color: "#06B6D4", bgColor: "#ECFEFF" },
  mention: { icon: "at", color: "#6366F1", bgColor: "#EEF2FF" },
  verification: {
    icon: "shield-checkmark",
    color: "#059669",
    bgColor: "#ECFDF5",
  },
  system: { icon: "information-circle", color: "#6B7280", bgColor: "#F9FAFB" },
};

/** Format relative time like "2m ago", "1h ago", "3d ago" */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationItem({
  notification,
  onPress,
  onDelete,
}: NotificationItemProps) {
  const config =
    NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.system;

  return (
    <TouchableOpacity
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
      className={`flex-row items-start px-4 py-3 border-b border-gray-100 ${
        notification.is_read ? "bg-white" : "bg-blue-50/50"
      }`}
    >
      {/* Avatar or icon */}
      <View className="mr-3 mt-0.5">
        {notification.actor?.profile_image_url ? (
          <View className="relative">
            <Image
              source={{ uri: notification.actor.profile_image_url }}
              className="w-11 h-11 rounded-full"
            />
            {/* Type badge overlay */}
            <View
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full items-center justify-center border-2 border-white"
              style={{ backgroundColor: config.color }}
            >
              <Ionicons name={config.icon} size={10} color="white" />
            </View>
          </View>
        ) : (
          <View
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: config.bgColor }}
          >
            <Ionicons name={config.icon} size={22} color={config.color} />
          </View>
        )}
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text
          className={`text-sm leading-5 ${
            notification.is_read ? "text-gray-700" : "text-black font-semibold"
          }`}
          numberOfLines={2}
        >
          {notification.title}
        </Text>
        {notification.body && (
          <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
            {notification.body}
          </Text>
        )}
        <Text className="text-xs text-gray-400 mt-1">
          {formatRelativeTime(notification.created_at)}
        </Text>
      </View>

      {/* Unread indicator */}
      {!notification.is_read && (
        <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2 ml-2" />
      )}
    </TouchableOpacity>
  );
}

export default NotificationItem;
