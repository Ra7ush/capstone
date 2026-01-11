import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profile);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View className="px-6 pt-16 pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <View>
            <Text className="text-gray-400 text-sm font-medium">
              Welcome back,
            </Text>
            <Text className="text-2xl font-black text-black">
              {profile?.username || "User"}
            </Text>
          </View>

          {/* Profile Avatar */}
          <TouchableOpacity className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center">
            {profile?.profile_image_url ? (
              <View className="w-12 h-12 rounded-full bg-black items-center justify-center">
                <Text className="text-white font-bold text-lg">
                  {profile.username?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            ) : (
              <Ionicons name="person" size={24} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Role Badge */}
        {profile?.role === "creator" && (
          <View className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-orange-500 items-center justify-center mr-3">
              <Ionicons name="star" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-orange-800 font-bold">Creator Account</Text>
              <Text className="text-orange-600 text-xs">
                Verification: {profile.verification_status || "pending"}
              </Text>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View className="mb-8">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Overview
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-gray-50 rounded-2xl p-4">
              <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
              <Text className="text-2xl font-black text-black mt-2">0</Text>
              <Text className="text-gray-400 text-xs font-medium">
                Products
              </Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-2xl p-4">
              <Ionicons name="cart-outline" size={24} color="#9CA3AF" />
              <Text className="text-2xl font-black text-black mt-2">0</Text>
              <Text className="text-gray-400 text-xs font-medium">Orders</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-8">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Quick Actions
          </Text>

          <TouchableOpacity className="bg-black rounded-2xl p-5 flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3">
                <Ionicons name="add" size={24} color="white" />
              </View>
              <Text className="text-white font-bold">Create New Product</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-50 rounded-2xl p-5 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
                <Ionicons name="settings-outline" size={24} color="#374151" />
              </View>
              <Text className="text-black font-bold">Account Settings</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="mt-4 py-4 items-center"
        >
          <Text className="text-red-500 font-bold">Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
