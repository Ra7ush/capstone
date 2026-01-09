import React from "react";
import { View, Text, ActivityIndicator } from "react-native";

export default function LoadingScreen() {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      {/* Logo */}
      <View className="bg-black w-20 h-20 rounded-3xl items-center justify-center shadow-2xl mb-8">
        <Text className="text-white text-4xl font-black italic">N</Text>
      </View>

      {/* Brand Name */}
      <Text className="text-3xl font-black text-black tracking-tighter mb-2">
        Nexus<Text className="text-gray-300">Hub</Text>
      </Text>

      {/* Loading Indicator */}
      <View className="mt-8">
        <ActivityIndicator size="small" color="#000000" />
      </View>
    </View>
  );
}
