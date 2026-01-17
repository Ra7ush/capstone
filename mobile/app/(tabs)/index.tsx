import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useAuthState } from "@/hooks/useAuthState";
import { useUser } from "@/hooks/useProfile";

export default function Home() {
  const router = useRouter();
  const { user: authUser, refresh: refreshAuth } = useAuthState();
  const {
    data: dbUser,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useUser();
  const [refreshing, setRefreshing] = useState(false);

  // Prioritize hook data (dbUser) over auth state, but fallback to authUser
  const profile = dbUser || authUser?.profile;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchUser(), refreshAuth()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  const isVerified = profile?.verification_status === "verified";
  const isPending = profile?.verification_status === "pending";
  const isRejected = profile?.verification_status === "rejected";
  const needsVerification = profile?.role === "creator" && !isVerified;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

          {/* Verification CTA Banner */}
          {needsVerification && (
            <TouchableOpacity
              onPress={() => router.push("/verification-apply")}
              className={`rounded-2xl p-5 mb-8 border ${
                isRejected
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <View className="flex-row items-center mb-4">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isRejected ? "bg-red-500" : "bg-yellow-500"
                  }`}
                >
                  <Ionicons
                    name={
                      isRejected
                        ? "alert-circle"
                        : isPending
                          ? "time"
                          : "shield-checkmark"
                    }
                    size={20}
                    color="white"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-bold ${
                      isRejected ? "text-red-800" : "text-yellow-800"
                    }`}
                  >
                    {isRejected
                      ? "Action Required"
                      : isPending
                        ? "Verification Pending"
                        : "Identity Check"}
                  </Text>
                  <Text
                    className={`${
                      isRejected ? "text-red-600" : "text-yellow-600"
                    } text-xs`}
                  >
                    Status: {profile?.verification_status}
                  </Text>
                </View>
              </View>

              <View className="bg-white/50 rounded-xl p-3 flex-row items-center justify-between border border-white">
                <Text className="text-gray-600 text-xs font-medium flex-1 mr-4">
                  {isRejected
                    ? "Your verification was rejected. Please update your documents."
                    : isPending
                      ? "Hang tight! Admins are reviewing your documents."
                      : "Complete your identity check to start selling."}
                </Text>
                {!isPending && (
                  <Ionicons name="arrow-forward" size={16} color="#4B5563" />
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Revenue Snapshot */}
          <View className="mb-8">
            <View className="bg-black rounded-[2.5rem] p-6 shadow-xl shadow-black/20">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-400 text-xs font-black uppercase tracking-widest">
                  Wallet Balance
                </Text>
                <View className="bg-[#FF4D00] px-3 py-1 rounded-full">
                  <Text className="text-white text-[10px] font-black uppercase">
                    Available
                  </Text>
                </View>
              </View>
              <Text className="text-white text-4xl font-black italic tracking-tighter mb-6">
                $1,280.50
              </Text>

              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-400 text-xs font-black uppercase tracking-widest">
                  Pending Payout
                </Text>
                <View className="bg-white/10 px-3 py-1 rounded-full">
                  <Text className="text-gray-300 text-[10px] font-black uppercase">
                    Processing
                  </Text>
                </View>
              </View>
              <Text className="text-white text-2xl font-black italic tracking-tighter">
                $450.00
              </Text>

              <View className="flex-row items-center mt-6 pt-6 border-t border-white/10">
                <TouchableOpacity className="flex-1 bg-white/10 py-3 rounded-2xl items-center mr-2">
                  <Text className="text-white font-bold text-sm">Withdraw</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 bg-[#FF4D00] py-3 rounded-2xl items-center ml-2">
                  <Text className="text-white font-bold text-sm">Insights</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Growth & Metrics */}
          <View className="mb-8">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Growth Sync
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <View className="w-[48%] bg-gray-50 rounded-3xl p-5 border border-gray-100">
                <View className="flex-row justify-between mb-2">
                  <Ionicons name="people" size={20} color="#9CA3AF" />
                  <Text className="text-green-500 text-[10px] font-black">
                    +12%
                  </Text>
                </View>
                <Text className="text-2xl font-black text-black">1,234</Text>
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  Total Followers
                </Text>
              </View>

              <View className="w-[48%] bg-gray-50 rounded-3xl p-5 border border-gray-100">
                <View className="flex-row justify-between mb-2">
                  <Ionicons name="cash-outline" size={20} color="#9CA3AF" />
                  <Text className="text-green-500 text-[10px] font-black">
                    +8%
                  </Text>
                </View>
                <Text className="text-2xl font-black text-black">$4,890</Text>
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  Monthly Revenue
                </Text>
              </View>

              <View className="w-[48%] bg-gray-50 rounded-3xl p-5 border border-gray-100">
                <View className="flex-row justify-between mb-2">
                  <Ionicons name="star" size={20} color="#9CA3AF" />
                  <Text className="text-orange-500 text-[10px] font-black">
                    98%
                  </Text>
                </View>
                <Text className="text-2xl font-black text-black">4.9</Text>
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  Rating
                </Text>
              </View>

              <View className="w-[48%] bg-gray-50 rounded-3xl p-5 border border-gray-100">
                <View className="flex-row justify-between mb-2">
                  <Ionicons name="trending-up" size={20} color="#9CA3AF" />
                  <Text className="text-blue-500 text-[10px] font-black">
                    Top 1%
                  </Text>
                </View>
                <Text className="text-2xl font-black text-black">#42</Text>
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  Rank
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-8">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Quick Actions
            </Text>

            <TouchableOpacity className="bg-white border border-gray-100 rounded-3xl p-5 flex-row items-center mb-4 shadow-sm">
              <View className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center mr-4">
                <Ionicons name="add-circle-outline" size={26} color="#FF4D00" />
              </View>
              <View className="flex-1">
                <Text className="text-black font-black text-lg">
                  Create Post
                </Text>
                <Text className="text-gray-500 text-xs font-medium">
                  Share updates with your community
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity className="bg-white border border-gray-100 rounded-3xl p-5 flex-row items-center mb-4 shadow-sm">
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mr-4">
                <Ionicons name="briefcase-outline" size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-black font-black text-lg">
                  Add Service
                </Text>
                <Text className="text-gray-500 text-xs font-medium">
                  Offer a new service or product
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity className="bg-white border border-gray-100 rounded-3xl p-5 flex-row items-center mb-4 shadow-sm">
              <View className="w-12 h-12 rounded-full bg-purple-50 items-center justify-center mr-4">
                <Ionicons name="calendar-outline" size={24} color="#A855F7" />
              </View>
              <View className="flex-1">
                <Text className="text-black font-black text-lg">
                  Schedule Event
                </Text>
                <Text className="text-gray-500 text-xs font-medium">
                  Plan a live session or meetup
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity className="bg-white border border-gray-100 rounded-3xl p-5 flex-row items-center shadow-sm">
              <View className="w-12 h-12 rounded-full bg-green-50 items-center justify-center mr-4">
                <Ionicons name="bar-chart-outline" size={24} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-black font-black text-lg">
                  View Analytics
                </Text>
                <Text className="text-gray-500 text-xs font-medium">
                  Check your growth metrics
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Recent Activity
              </Text>
              <TouchableOpacity>
                <Text className="text-[#FF4D00] text-xs font-bold">
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            <View className="bg-gray-50 rounded-[2.5rem] p-2 border border-gray-100">
              <View className="bg-white rounded-[2rem] p-4 flex-row items-center mb-1">
                <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                  <Text className="text-orange-600 font-bold">JD</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-black font-bold text-sm">
                    John Doe joined your community
                  </Text>
                  <Text className="text-gray-400 text-[10px] font-medium">
                    2 min ago
                  </Text>
                </View>
              </View>

              <View className="bg-white rounded-[2rem] p-4 flex-row items-center mb-1">
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Text className="text-blue-600 font-bold">SM</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-black font-bold text-sm">
                    Sarah M. purchased Premium tier
                  </Text>
                  <Text className="text-gray-400 text-[10px] font-medium">
                    1 hour ago
                  </Text>
                </View>
              </View>

              <View className="bg-white rounded-[2rem] p-4 flex-row items-center mb-1">
                <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                  <Text className="text-purple-600 font-bold">AK</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-black font-bold text-sm">
                    Alex K. commented on your post
                  </Text>
                  <Text className="text-gray-400 text-[10px] font-medium">
                    3 hours ago
                  </Text>
                </View>
              </View>

              <View className="bg-white rounded-[2rem] p-4 flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                  <Text className="text-green-600 font-bold">MR</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-black font-bold text-sm">
                    Mike R. booked a consultation
                  </Text>
                  <Text className="text-gray-400 text-[10px] font-medium">
                    5 hours ago
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Profile Helper (Temporary replacement for old settings button) */}
          <TouchableOpacity
            onPress={handleLogout}
            className="mt-4 py-4 items-center bg-gray-50 rounded-2xl border border-dashed border-gray-200"
          >
            <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest">
              Session: Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
