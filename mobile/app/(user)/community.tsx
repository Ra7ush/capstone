import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

/**
 * User Community Screen (Placeholder)
 *
 * This will be built out with:
 * - View creator communities
 * - Join and interact with communities
 * - Community feed
 */
export default function UserCommunity() {
  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-14 pb-4 bg-white">
        <Text className="text-2xl font-black text-black">Community</Text>
        <Text className="text-gray-400 mt-1">Connect with creators</Text>
      </View>

      {/* Placeholder Content */}
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-6">
          <Ionicons name="people-outline" size={40} color="#9CA3AF" />
        </View>
        <Text className="text-xl font-bold text-black text-center mb-2">
          Coming Soon
        </Text>
        <Text className="text-gray-400 text-center">
          Join creator communities and engage with other fans.
        </Text>
      </View>
    </View>
  );
}
