import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { useAuthState } from "@/hooks/useAuthState";
import { useUser } from "@/hooks/useProfile";
import { formatTimeAgo } from "@/lib/utils";
import { RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJoinedCommunities } from "@/hooks/useCommunity";
import { usePurchasedServiceIds } from "@/hooks/useServices";

export default function Profile() {
  const router = useRouter();
  const { user: authUser, refresh: refreshAuth } = useAuthState();
  const insets = useSafeAreaInsets();
  const {
    data: dbUser,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useUser();
  const [refreshing, setRefreshing] = useState(false);

  // Prioritize hook data (dbUser) over auth state, but fallback to authUser
  const profile = dbUser || authUser?.profile;

  const { data: joinedCommunities } = useJoinedCommunities();
  const { data: purchasedServiceIds } = usePurchasedServiceIds();

  const stats = {
    services: purchasedServiceIds?.length || 0,
    communities: joinedCommunities?.data?.length || 0,
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

  interface SectionItem {
    icon: string;
    label: string;
    route: string;
    value?: string;
    statusColor?: string;
  }

  const sections: { title: string; items: SectionItem[] }[] = [
    {
      title: "Account",
      items: [
        ...(profile?.role === "creator"
          ? [
              {
                icon: "person-outline",
                label: "Personal Information",
                route: "/profile-edit?mode=full",
              },
            ]
          : []),
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

  const creatorSection =
    profile?.role === "creator"
      ? {
          title: "Creator Management",
          items: [
            {
              icon: "layers-outline",
              label: "Manage Services",
              route: "/(user)/service",
            },
            {
              icon: "shield-checkmark-outline",
              label: "Verification Status",
              route: "/verification-apply",
              value:
                profile?.verification_status === "pending"
                  ? "Under Review"
                  : profile?.verification_status === "verified"
                    ? "Verified"
                    : undefined,
              statusColor:
                profile?.verification_status === "pending"
                  ? "text-yellow-500"
                  : profile?.verification_status === "verified"
                    ? "text-green-500"
                    : undefined,
            },
            {
              icon: "trending-up-outline",
              label: "Analytics & Earnings",
              route: "/advanced-settings", // Placeholder for now
            },
          ],
        }
      : null;

  const allSections = creatorSection
    ? [sections[0], creatorSection, ...sections.slice(1)]
    : sections;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header / Brand Profile */}
        <View
          className="px-6 pb-8 bg-black"
          style={{ paddingTop: insets.top + 12 }}
        >
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
              onPress={() => router.push("/profile-edit?mode=basic")}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="pencil" size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Core Stats */}
          <View className="flex-row bg-white/5 rounded-3xl p-4 border border-white/10">
            <View className="flex-1 items-center border-r border-white/10">
              <Text className="text-white font-black text-lg italic">
                {stats.services}
              </Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase">
                Services
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-white font-black text-lg italic">
                {stats.communities}
              </Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase">
                Communities
              </Text>
            </View>
          </View>
        </View>

        {/* Setting Groups */}
        <View className="px-6 py-8">
          {allSections.map((section, idx) => (
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
                    {item.value && (
                      <Text
                        className={`mr-2 text-[10px] font-black uppercase ${item.statusColor || "text-gray-400"}`}
                      >
                        {item.value}
                      </Text>
                    )}
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
    </View>
  );
}
