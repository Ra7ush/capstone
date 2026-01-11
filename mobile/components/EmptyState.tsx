import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  title: string;
  description?: string;
  header?: string;
  children?: React.ReactNode;
}

/**
 * EmptyState Component
 *
 * A reusable component for displaying empty states across the app.
 * Use when lists are empty, no results found, or no data available.
 */
export function EmptyState({
  icon = "folder-open-outline",
  iconSize = 80,
  iconColor = "#9CA3AF",
  title,
  description,
  header,
  children,
}: EmptyStateProps) {
  return (
    <View className="flex-1 bg-white">
      {header && (
        <View className="px-6 pt-16 pb-5">
          <Text className="text-black text-3xl font-bold tracking-tight">
            {header}
          </Text>
        </View>
      )}
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name={icon} size={iconSize} color={iconColor} />
        <Text className="text-black font-semibold text-xl mt-4 text-center">
          {title}
        </Text>
        {description && (
          <Text className="text-gray-400 text-center mt-2">{description}</Text>
        )}
        {children && <View className="mt-6">{children}</View>}
      </View>
    </View>
  );
}

export default EmptyState;
