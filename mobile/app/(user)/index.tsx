import { View, Text, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

/**
 * User Home Screen (Test)
 */
export default function UserHome() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Simple test content */}
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
          <Ionicons name="checkmark-circle" size={50} color="#22C55E" />
        </View>
        <Text className="text-2xl font-black text-black text-center mb-2">
          This is Home Tab
        </Text>
        <Text className="text-gray-400 text-center mb-8">
          You are signed in as a regular user!
        </Text>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-black px-8 py-4 rounded-2xl"
        >
          <Text className="text-white font-bold">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
