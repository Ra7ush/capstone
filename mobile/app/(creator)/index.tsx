import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import {
  useCreatorStats,
  useRecentActivity,
  ActivityItem,
} from "@/hooks/useCreator";
import { useAuthState } from "@/hooks/useAuthState";
import { useUser } from "@/hooks/useProfile";
import { useMyServices } from "@/hooks/useServices";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const { user: authUser, refresh: refreshAuth } = useAuthState();
  const {
    data: dbUser,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useUser();
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useCreatorStats();
  const { data: myServicesResponse, refetch: refetchMyServices } =
    useMyServices();
  const { data: activities, refetch: refetchActivity } = useRecentActivity();
  const meta = myServicesResponse?.meta;
  const [refreshing, setRefreshing] = useState(false);

  // Prioritize hook data (dbUser) over auth state, but fallback to authUser
  const profile = dbUser || authUser?.profile;

  // Refreshing the page for the new data changes.
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchUser(),
        refreshAuth(),
        refetchStats(),
        refetchMyServices(),
        refetchActivity(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper to format relative time
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Helper to get activity color
  const getActivityColor = (type: string) => {
    switch (type) {
      case "follow":
        return { bg: "bg-blue-100", text: "text-blue-600" };
      case "comment":
        return { bg: "bg-purple-100", text: "text-purple-600" };
      case "like":
        return { bg: "bg-red-100", text: "text-red-600" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-600" };
    }
  };

  // Need to remove later.
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

          {/* Upgrade Banner for Free Users */}
          {!meta?.is_pro && !isLoadingUser && (
            <TouchableOpacity
              onPress={() => router.push("/subscription-upgrade")}
              className="bg-[#FF4D00]/10 border border-[#FF4D00]/20 rounded-3xl p-5 mb-8 flex-row items-center justify-between"
            >
              <View className="flex-1 mr-4">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="sparkles" size={16} color="#FF4D00" />
                  <Text className="text-[#FF4D00] font-black text-[10px] uppercase tracking-widest ml-1">
                    Nexus Pro
                  </Text>
                </View>
                <Text className="text-black font-black text-lg">
                  Scale Your Store
                </Text>
                <Text className="text-gray-500 text-xs font-medium">
                  Unlock unlimited courses, lower fees & priority support.
                </Text>
              </View>
              <View className="bg-[#FF4D00] w-12 h-12 rounded-full items-center justify-center">
                <Ionicons name="arrow-up" size={24} color="white" />
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
                <View className="flex-row items-center gap-2">
                  <View className="bg-[#FF4D00] px-3 py-1 rounded-full">
                    <Text className="text-white text-[10px] font-black uppercase">
                      Available
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => refetchStats()}
                    disabled={isLoadingStats || refreshing}
                    className="w-6 h-6 items-center justify-center bg-white/20 rounded-full"
                  >
                    {isLoadingStats || refreshing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="refresh" size={12} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <Text className="text-white text-4xl font-black italic tracking-tighter mb-6">
                {stats
                  ? `$${stats.wallet_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "$0.00"}
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
                {stats
                  ? `$${stats.pending_payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "$0.00"}
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
                </View>
                <Text className="text-2xl font-black text-black">
                  {stats?.followers_count?.toLocaleString() || "0"}
                </Text>
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  Followers
                </Text>
              </View>

              <View className="w-[48%] bg-gray-50 rounded-3xl p-5 border border-gray-100">
                <View className="flex-row justify-between mb-2">
                  <Ionicons name="cash-outline" size={20} color="#9CA3AF" />
                </View>
                <Text className="text-2xl font-black text-black">
                  $
                  {stats?.monthly_revenue?.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }) || "0"}
                </Text>
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  This Month
                </Text>
              </View>

              <View className="w-[48%] bg-gray-50 rounded-3xl p-5 border border-gray-100">
                <View className="flex-row justify-between mb-2">
                  <Ionicons name="wallet-outline" size={20} color="#9CA3AF" />
                </View>
                <Text className="text-2xl font-black text-black">
                  $
                  {stats?.total_earnings?.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }) || "0"}
                </Text>
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  Total Earned
                </Text>
              </View>

              <View className="w-[48%] bg-gray-50 rounded-3xl p-5 border border-gray-100">
                <View className="flex-row justify-between mb-2">
                  <Ionicons name="star" size={20} color="#FBBF24" />
                  {stats?.total_ratings ? (
                    <Text className="text-gray-400 text-[10px] font-black">
                      {stats.total_ratings} reviews
                    </Text>
                  ) : null}
                </View>
                <Text className="text-2xl font-black text-black">
                  {stats?.average_rating?.toFixed(1) || "0.0"}
                </Text>
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  Rating
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-8">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Quick Actions
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(creator)/community")}
              className="bg-white border border-gray-100 rounded-3xl p-5 flex-row items-center mb-4 shadow-sm"
            >
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

            <TouchableOpacity
              onPress={() => router.push("/(creator)/service")}
              className="bg-white border border-gray-100 rounded-3xl p-5 flex-row items-center mb-4 shadow-sm"
            >
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

            <TouchableOpacity
              onPress={() => router.push("/(creator)/message")}
              className="bg-white border border-gray-100 rounded-3xl p-5 flex-row items-center mb-4 shadow-sm"
            >
              <View className="w-12 h-12 rounded-full bg-purple-50 items-center justify-center mr-4">
                <Ionicons
                  name="chatbubbles-outline"
                  size={24}
                  color="#A855F7"
                />
              </View>
              <View className="flex-1">
                <Text className="text-black font-black text-lg">Messages</Text>
                <Text className="text-gray-500 text-xs font-medium">
                  Chat with your community
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(creator)/profile")}
              className="bg-white border border-gray-100 rounded-3xl p-5 flex-row items-center shadow-sm"
            >
              <View className="w-12 h-12 rounded-full bg-green-50 items-center justify-center mr-4">
                <Ionicons name="person-outline" size={24} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-black font-black text-lg">
                  Edit Profile
                </Text>
                <Text className="text-gray-500 text-xs font-medium">
                  Update your personal details
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
            </View>

            <View className="bg-gray-50 rounded-[2.5rem] p-2 border border-gray-100">
              {activities && activities.length > 0 ? (
                activities.slice(0, 5).map((activity, index) => {
                  const colors = getActivityColor(activity.type);
                  const initials = activity.user?.full_name
                    ? activity.user.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : activity.user?.username?.slice(0, 2).toUpperCase() ||
                      "??";

                  return (
                    <View
                      key={activity.id}
                      className={`bg-white rounded-[2rem] p-4 flex-row items-center ${index < 4 ? "mb-1" : ""}`}
                    >
                      {activity.user?.profile_image_url ? (
                        <Image
                          source={{ uri: activity.user.profile_image_url }}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                      ) : (
                        <View
                          className={`w-10 h-10 rounded-full ${colors.bg} items-center justify-center mr-3`}
                        >
                          <Text className={`${colors.text} font-bold`}>
                            {initials}
                          </Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-black font-bold text-sm">
                          {activity.message}
                        </Text>
                        <Text className="text-gray-400 text-[10px] font-medium">
                          {formatTimeAgo(activity.created_at)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="bg-white rounded-[2rem] p-6 items-center">
                  <Ionicons
                    name="notifications-off-outline"
                    size={32}
                    color="#D1D5DB"
                  />
                  <Text className="text-gray-400 font-bold text-sm mt-2">
                    No recent activity
                  </Text>
                  <Text className="text-gray-300 text-xs">
                    New follows, likes and comments will appear here
                  </Text>
                </View>
              )}
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
