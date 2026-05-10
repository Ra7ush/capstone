import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useMemo } from "react";
import { useUser } from "@/hooks/useProfile";
import { useAuthState } from "@/hooks/useAuthState";
import { useNotifications } from "@/hooks/useNotifications";
import { useAllServices, usePurchasedServiceIds } from "@/hooks/useServices";
import { useSuggestedCreators } from "@/hooks/useFollow";
import { useJoinedCommunities, type Community } from "@/hooks/useCommunity";
import { useAIRecommendations } from "@/hooks/useAI";
import type { Service } from "@/types";

/**
 * User Home Screen
 *
 * Sections:
 * 1. Greeting + notification bell
 * 2. Continue Learning (purchased courses)
 * 3. Suggested Creators to follow
 * 4. Trending Courses
 * 5. Your Communities + Quick Actions
 */
export default function UserHome() {
  const router = useRouter();
  const { user: authUser } = useAuthState();
  const { data: dbUser, refetch: refetchUser } = useUser();
  const profile = dbUser || authUser?.profile;
  const { unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  // Data hooks
  const {
    data: allServices,
    isLoading: loadingServices,
    refetch: refetchServices,
  } = useAllServices();
  const { data: purchasedIds = [], refetch: refetchPurchased } =
    usePurchasedServiceIds();
  const {
    data: suggestedCreators,
    isLoading: loadingCreators,
    refetch: refetchCreators,
  } = useSuggestedCreators(8);
  const { data: joinedData, refetch: refetchCommunities } =
    useJoinedCommunities();
  const {
    data: aiRecommendations,
    isLoading: loadingRecommendations,
    isFetched: recommendationsFetched,
    isError: recommendationsError,
    refetch: refetchRecommendations,
  } = useAIRecommendations();

  // Derived data
  const purchasedCourses = useMemo(() => {
    if (!allServices || !purchasedIds.length) return [];
    return allServices.filter((s: Service) => purchasedIds.includes(s.id));
  }, [allServices, purchasedIds]);

  const trendingCourses = useMemo(() => {
    if (!allServices) return [];
    return [...allServices]
      .sort(
        (a: Service, b: Service) =>
          (b.average_rating || 0) - (a.average_rating || 0),
      )
      .slice(0, 8);
  }, [allServices]);

  const communities = useMemo(() => {
    return joinedData?.data?.map((m: any) => m.community).filter(Boolean) || [];
  }, [joinedData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const promises: Promise<any>[] = [
        refetchUser(),
        refetchServices(),
        refetchPurchased(),
        refetchCreators(),
        refetchCommunities(),
      ];
      // Only refetch AI recommendations if they've been loaded before
      if (recommendationsFetched) {
        promises.push(refetchRecommendations());
      }
      await Promise.all(promises);
    } finally {
      setRefreshing(false);
    }
  };

  const getInitials = (name?: string | null) =>
    name?.slice(0, 1).toUpperCase() || "?";

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push("/(user)/profile")}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center overflow-hidden mr-3 border border-gray-200"
          >
            {profile?.profile_image_url ? (
              <Image
                source={{ uri: profile.profile_image_url }}
                className="w-full h-full"
              />
            ) : (
              <Text className="text-black font-black text-sm">
                {getInitials(profile?.username)}
              </Text>
            )}
          </TouchableOpacity>
          <View>
            <Text className="text-gray-400 text-xs font-semibold">
              Welcome back,
            </Text>
            <Text className="text-lg font-black text-black -mt-0.5">
              {profile?.username || "User"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/notifications")}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <Ionicons name="notifications-outline" size={22} color="black" />
          {unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
              <Text className="text-white text-[10px] font-bold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ── Section 1: Continue Learning ── */}
        {purchasedCourses.length > 0 && (
          <View className="mt-4 mb-6">
            <SectionHeader title="Continue Learning" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}
            >
              {purchasedCourses.map((course: Service) => (
                <TouchableOpacity
                  key={course.id}
                  className="w-56 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100"
                  onPress={() =>
                    router.push({
                      pathname: "/course-learn",
                      params: { id: course.id },
                    } as any)
                  }
                >
                  {course.thumbnail_url ? (
                    <Image
                      source={{ uri: course.thumbnail_url }}
                      className="w-full h-28"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-28 bg-gray-200 items-center justify-center">
                      <Ionicons name="book-outline" size={28} color="#9CA3AF" />
                    </View>
                  )}
                  <View className="p-3">
                    <Text
                      className="text-sm font-bold text-black"
                      numberOfLines={2}
                    >
                      {course.title}
                    </Text>
                    <Text className="text-xs text-gray-400 font-medium mt-1">
                      {course.creator?.username || "Creator"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Section 2: Suggested Creators ── */}
        <View className="mb-6 mt-2">
          <SectionHeader title="Suggested Creators" />
          {loadingCreators ? (
            <ActivityIndicator
              size="small"
              color="#000"
              style={{ marginVertical: 20 }}
            />
          ) : suggestedCreators && suggestedCreators.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
            >
              {suggestedCreators.map((creator: any) => (
                <TouchableOpacity
                  key={creator.id}
                  className="w-36 bg-gray-50 rounded-2xl p-4 items-center border border-gray-100"
                  onPress={() =>
                    router.push({
                      pathname: "/user-profile",
                      params: { userId: creator.id },
                    } as any)
                  }
                >
                  <View className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center overflow-hidden mb-3">
                    {creator.profile_image_url ? (
                      <Image
                        source={{ uri: creator.profile_image_url }}
                        className="w-full h-full"
                      />
                    ) : (
                      <Text className="text-black font-black text-lg">
                        {getInitials(creator.username)}
                      </Text>
                    )}
                  </View>
                  <Text
                    className="text-sm font-bold text-black text-center"
                    numberOfLines={1}
                  >
                    {creator.username}
                  </Text>
                  {creator.verification_status === "verified" && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#3B82F6"
                      />
                      <Text className="text-[10px] text-blue-500 font-semibold ml-0.5">
                        Verified
                      </Text>
                    </View>
                  )}
                  <Text className="text-[11px] text-gray-400 font-medium mt-1">
                    {creator.followers_count || 0}{" "}
                    {creator.followers_count === 1 ? "follower" : "followers"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <EmptyInline
              icon="people-outline"
              text="No suggestions right now"
            />
          )}
        </View>

        {/* ── AI Recommended For You ── */}
        {aiRecommendations && aiRecommendations.length > 0 ? (
          <View className="mb-6 mt-2">
            <View className="flex-row items-center justify-between px-6 mb-3">
              <View className="flex-row items-center">
                <Ionicons name="sparkles" size={14} color="#7C3AED" />
                <Text className="text-base font-black text-black ml-1.5">
                  Recommended For You
                </Text>
              </View>
              <View className="bg-purple-50 px-2 py-1 rounded-full">
                <Text className="text-purple-600 text-[10px] font-bold">
                  AI
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}
            >
              {aiRecommendations.map((course: Service) => (
                <TouchableOpacity
                  key={course.id}
                  className="w-60 bg-purple-50 rounded-2xl overflow-hidden border border-purple-100"
                  onPress={() =>
                    router.push({
                      pathname: "/service-detail",
                      params: { id: course.id },
                    } as any)
                  }
                >
                  {course.thumbnail_url ? (
                    <Image
                      source={{ uri: course.thumbnail_url }}
                      className="w-full h-32"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-32 bg-purple-100 items-center justify-center">
                      <Ionicons name="sparkles" size={32} color="#7C3AED" />
                    </View>
                  )}
                  <View className="p-3">
                    <Text
                      className="text-sm font-bold text-black"
                      numberOfLines={2}
                    >
                      {course.title}
                    </Text>
                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-row items-center">
                        <Ionicons name="star" size={12} color="#FBBF24" />
                        <Text className="text-xs font-bold text-black ml-1">
                          {course.average_rating?.toFixed(1) || "New"}
                        </Text>
                      </View>
                      <Text className="text-sm font-black text-black">
                        {course.price ? `$${course.price}` : "Free"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View className="mb-6 mt-2 px-6">
            <TouchableOpacity
              className="flex-row items-center justify-center bg-purple-50 border border-purple-200 rounded-2xl py-4 px-6"
              onPress={() => refetchRecommendations()}
              disabled={loadingRecommendations}
            >
              {loadingRecommendations ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#7C3AED" />
                  <Text className="text-purple-700 font-bold text-sm ml-2">
                    {recommendationsError
                      ? "Retry AI Recommendations"
                      : "Get AI Course Recommendations"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Section 3: Trending Courses ── */}
        <View className="mb-6">
          <SectionHeader
            title="Trending Courses"
            actionLabel="See All"
            onAction={() => router.push("/(user)/service")}
          />
          {loadingServices ? (
            <ActivityIndicator
              size="small"
              color="#000"
              style={{ marginVertical: 20 }}
            />
          ) : trendingCourses.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}
            >
              {trendingCourses.map((course: Service) => (
                <TouchableOpacity
                  key={course.id}
                  className="w-60 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100"
                  onPress={() =>
                    router.push({
                      pathname: "/service-detail",
                      params: { id: course.id },
                    } as any)
                  }
                >
                  {course.thumbnail_url ? (
                    <Image
                      source={{ uri: course.thumbnail_url }}
                      className="w-full h-32"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-32 bg-gray-200 items-center justify-center">
                      <Ionicons
                        name="play-circle-outline"
                        size={32}
                        color="#9CA3AF"
                      />
                    </View>
                  )}
                  <View className="p-3">
                    <Text
                      className="text-sm font-bold text-black"
                      numberOfLines={2}
                    >
                      {course.title}
                    </Text>
                    <View className="flex-row items-center mt-1.5">
                      <Text className="text-xs text-gray-400 font-medium">
                        {course.creator?.username || "Creator"}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-row items-center">
                        <Ionicons name="star" size={12} color="#FBBF24" />
                        <Text className="text-xs font-bold text-black ml-1">
                          {course.average_rating?.toFixed(1) || "New"}
                        </Text>
                        {course.total_reviews > 0 && (
                          <Text className="text-[10px] text-gray-400 ml-1">
                            ({course.total_reviews})
                          </Text>
                        )}
                      </View>
                      <Text className="text-sm font-black text-black">
                        {course.price ? `$${course.price}` : "Free"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <EmptyInline icon="book-outline" text="No courses available yet" />
          )}
        </View>

        {/* ── Section 4: Your Communities ── */}
        <View className="mb-6">
          <SectionHeader
            title="Your Communities"
            actionLabel="Discover"
            onAction={() => router.push("/(user)/community")}
          />
          {communities.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
            >
              {communities.map((community: Community) => (
                <TouchableOpacity
                  key={community.id}
                  className="w-44 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100"
                  onPress={() =>
                    router.push({
                      pathname: "/community-detail",
                      params: { id: community.id },
                    } as any)
                  }
                >
                  {community.banner_url ? (
                    <Image
                      source={{ uri: community.banner_url }}
                      className="w-full h-20"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-20 bg-gray-200 items-center justify-center">
                      <Ionicons
                        name="people-outline"
                        size={24}
                        color="#9CA3AF"
                      />
                    </View>
                  )}
                  <View className="p-3">
                    <Text
                      className="text-sm font-bold text-black"
                      numberOfLines={1}
                    >
                      {community.name}
                    </Text>
                    <Text className="text-[11px] text-gray-400 font-medium mt-0.5">
                      {community.members_count || 0} members
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <EmptyInline
              icon="people-outline"
              text="Join a community to see it here"
            />
          )}
        </View>

        {/* ── Section 5: Quick Actions ── */}
        <View className="px-6 mb-10">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-black rounded-2xl p-4 items-center"
              onPress={() => router.push("/(user)/service")}
            >
              <Ionicons name="search" size={22} color="white" />
              <Text className="text-white text-xs font-bold mt-2">
                Browse Courses
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-100 rounded-2xl p-4 items-center"
              onPress={() => router.push("/(user)/community")}
            >
              <Ionicons name="people" size={22} color="black" />
              <Text className="text-black text-xs font-bold mt-2">
                Communities
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-100 rounded-2xl p-4 items-center"
              onPress={() => router.push("/(user)/message")}
            >
              <Ionicons name="chatbubbles" size={22} color="black" />
              <Text className="text-black text-xs font-bold mt-2">
                Messages
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Stack.Screen options={{ headerShown: false }} />
    </View>
  );
}

// ─── Reusable Sub-components ────────────────────────────────

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-6 mb-3">
      <Text className="text-base font-black text-black">{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text className="text-xs font-bold text-gray-400">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyInline({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="items-center py-8 mx-6 bg-gray-50 rounded-2xl">
      <Ionicons name={icon as any} size={28} color="#D1D5DB" />
      <Text className="text-gray-400 text-xs font-bold mt-2">{text}</Text>
    </View>
  );
}
