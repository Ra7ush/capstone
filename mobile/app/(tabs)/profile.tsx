import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { useAuthState } from "@/hooks/useAuthState";
import { useFollow } from "@/hooks/useFollow";
import { useUser } from "@/hooks/useProfile";
import { formatTimeAgo } from "@/lib/utils";
import { RefreshControl } from "react-native";

export default function Profile() {
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

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"followers" | "following">(
    "followers"
  );

  const { followers, following, isLoadingFollowers, isLoadingFollowing } =
    useFollow(authUser?.id);

  const stats = {
    followers: profile?.followers_count || 0,
    following: profile?.following_count || 0,
    rating: profile?.rating || 4.9,
  };

  const handleOpenModal = (type: "followers" | "following") => {
    setModalType(type);
    setModalVisible(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchUser(), refreshAuth()]);
    } finally {
      setRefreshing(false);
    }
  };

  const sections = [
    {
      title: "Account",
      items: [
        {
          icon: "person-outline",
          label: "Personal Information",
          route: "/profile-edit",
        },
        {
          icon: "star-outline",
          label: "My Subscriptions",
          route: "/subscriptions",
        },
        {
          icon: "wallet-outline",
          label: "Payment Methods",
          route: "/payments",
        },
      ],
    },
    {
      title: "Settings",
      items: [
        {
          icon: "settings-outline",
          label: "Advanced Settings",
          route: "/advanced-settings",
        },
        {
          icon: "notifications-outline",
          label: "Notifications",
          route: "/notifications",
        },
        {
          icon: "shield-checkmark-outline",
          label: "Privacy & Security",
          route: "/security",
        },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "help-circle-outline", label: "Help Center", route: "/help" },
        {
          icon: "document-text-outline",
          label: "Terms of Service",
          route: "/terms",
        },
      ],
    },
  ];

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header / Brand Profile */}
        <View className="px-6 pt-16 pb-8 bg-black">
          <View className="flex-row items-center gap-4 mb-6">
            <View className="w-20 h-20 rounded-full bg-[#FF4D00] items-center justify-center border-4 border-white/10">
              <Text className="text-white text-3xl font-black italic">
                {profile?.username?.[0]?.toUpperCase() || "B"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white text-2xl font-black italic tracking-tighter">
                {profile?.full_name || profile?.username || "Nexus User"}
              </Text>
              <Text className="text-gray-400 font-bold">
                @{profile?.username || "user"}
              </Text>
              <View className="flex-row items-center mt-2 flex-wrap gap-2">
                {profile?.role && (
                  <View className="bg-[#FF4D00] px-2 py-0.5 rounded-full">
                    <Text className="text-white text-[10px] font-black uppercase">
                      {profile.role}
                    </Text>
                  </View>
                )}
                {profile?.verification_status &&
                  profile.verification_status !== "none" && (
                    <View
                      className={`px-2 py-0.5 rounded-full flex-row items-center ${
                        profile.verification_status === "verified"
                          ? "bg-blue-500"
                          : profile.verification_status === "rejected"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                      }`}
                    >
                      <Text className="text-white text-[10px] font-black uppercase">
                        {profile.verification_status}
                      </Text>
                    </View>
                  )}
                <Text className="text-gray-500 text-[10px] font-black uppercase">
                  ID:{" "}
                  {dbUser?.id?.slice(0, 8)?.toUpperCase() ||
                    authUser?.id?.slice(0, 8)?.toUpperCase() ||
                    "--------"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/profile-edit")}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="pencil" size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Core Stats */}
          <View className="flex-row bg-white/5 rounded-3xl p-4 border border-white/10">
            <TouchableOpacity
              onPress={() => handleOpenModal("followers")}
              className="flex-1 items-center border-r border-white/10"
            >
              <Text className="text-white font-black text-lg italic">
                {stats.followers}
              </Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase">
                Followers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleOpenModal("following")}
              className="flex-1 items-center border-r border-white/10"
            >
              <Text className="text-white font-black text-lg italic">
                {stats.following}
              </Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase">
                Following
              </Text>
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-white font-black text-lg italic">
                {stats.rating}
              </Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase">
                Rating
              </Text>
            </View>
          </View>
        </View>

        {/* Setting Groups */}
        <View className="px-6 py-8">
          {sections.map((section, idx) => (
            <View key={idx} className="mb-8">
              <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">
                {section.title}
              </Text>
              <View className="bg-gray-50 rounded-[2.5rem] p-2 border border-gray-100">
                {section.items.map((item, itemIdx) => (
                  <TouchableOpacity
                    key={itemIdx}
                    onPress={() => router.push(item.route as any)}
                    className={`bg-white rounded-[2rem] p-4 flex-row items-center mb-1 ${
                      itemIdx === section.items.length - 1 ? "mb-0" : ""
                    }`}
                  >
                    <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3">
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color="black"
                      />
                    </View>
                    <Text className="flex-1 text-black font-bold">
                      {item.label}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#D1D5DB"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout Action */}
          <TouchableOpacity
            onPress={handleLogout}
            className="mt-4 py-5 items-center bg-red-50 rounded-[2.5rem] border border-red-100"
          >
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="text-red-500 font-black uppercase tracking-widest ml-2">
                Disconnect Session
              </Text>
            </View>
          </TouchableOpacity>

          <Text className="text-center text-gray-300 text-[10px] font-black uppercase tracking-widest mt-12 mb-8">
            Nexus Protocol • v1.0.42
          </Text>
        </View>
      </ScrollView>

      {/* Follow List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[3rem] h-[80%] p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-black italic uppercase tracking-tighter">
                {modalType === "followers" ? "Followers" : "Following"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            {(
              modalType === "followers"
                ? isLoadingFollowers
                : isLoadingFollowing
            ) ? (
              <ActivityIndicator
                size="large"
                color="#FF4D00"
                className="mt-20"
              />
            ) : (
              <FlatList
                data={modalType === "followers" ? followers : following}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View className="flex-row items-center justify-between mb-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                    <View className="flex-row items-center gap-3">
                      <View className="w-12 h-12 rounded-full bg-[#FF4D00] items-center justify-center">
                        <Text className="text-white font-bold text-lg">
                          {item.username?.[0]?.toUpperCase() || "U"}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-black font-black text-sm">
                          {item.username}
                        </Text>
                        <Text className="text-gray-400 text-xs font-bold uppercase">
                          @{item.username}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      className="bg-black px-4 py-2 rounded-full"
                      onPress={() => {
                        setModalVisible(false);
                        // Future: navigate to their profile
                      }}
                    >
                      <Text className="text-white text-xs font-black uppercase">
                        View
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View className="items-center mt-20">
                    <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                    <Text className="text-gray-400 font-bold mt-4">
                      No {modalType} yet
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
