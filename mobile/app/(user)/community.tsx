import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import {
  useDiscoverCommunities,
  useCommunity,
  useJoinedCommunities,
  useCommunityDetail,
  Post,
} from "@/hooks/useCommunity";

const CATEGORIES = [
  "All",
  "Art",
  "Music",
  "Games",
  "Podcast",
  "Writing",
  "Photography",
  "Education",
  "Tech",
];

/**
 * Integrated User Community Screen
 * A single-screen experience to discover, join, and switch between communities.
 */
export default function UserCommunity() {
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  // Discovery Data
  const { data: discoverData, isLoading: isDiscoverLoading } =
    useDiscoverCommunities({
      category: selectedCategory === "All" ? undefined : selectedCategory,
      search: debouncedSearch || undefined,
    });

  // Joined Communities Data
  const { data: joinedData, isLoading: isJoinedLoading } =
    useJoinedCommunities();

  // Selected Community Detail Data
  const { data: detailData, isLoading: isDetailLoading } = useCommunityDetail(
    activeCommunityId || "",
  );
  const { feed, isLoadingFeed, refetchFeed, joinCommunity } = useCommunity(
    activeCommunityId || "",
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeCommunityId) {
        await refetchFeed();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoin = async (id: string) => {
    try {
      // TODO: Show success toast/feedback
      await joinCommunity(id);
    } catch (e) {
      // TODO: Show error toast/feedback
      console.error(e);
    }
  };

  const joinedList = joinedData?.data || [];
  const discoverList = discoverData?.data || [];
  const activeCommunity = detailData?.data;
  const posts = feed || [];

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* 1. TOP SWITCHER (Discovery + Joined Avatars) */}
      <View className="pt-14 pb-4 px-6 bg-white border-b border-gray-50 flex-row items-center">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Discovery Icon */}
          <View className="items-center mr-5">
            <TouchableOpacity
              onPress={() => setActiveCommunityId(null)}
              className={`w-14 h-14 rounded-2xl items-center justify-center border-2 ${activeCommunityId === null ? "border-[#FF4D00] bg-[#FF4D00]/5" : "border-gray-50 bg-gray-50"}`}
            >
              <Ionicons
                name="compass"
                size={28}
                color={activeCommunityId === null ? "#FF4D00" : "#9CA3AF"}
              />
            </TouchableOpacity>
            <Text
              className={`text-[10px] mt-1.5 font-black uppercase tracking-tighter ${activeCommunityId === null ? "text-[#FF4D00]" : "text-gray-400"}`}
            >
              Discover
            </Text>
          </View>

          {/* Joined Avatars */}
          {joinedList.map((item, index) => (
            <View
              key={item.community?.id || item.community_id || `joined-${index}`}
              className="items-center mr-5"
            >
              <TouchableOpacity
                onPress={() => {
                  const communityId = item.community?.id;
                  if (communityId) {
                    setActiveCommunityId(communityId);
                  }
                }}
                className={`w-14 h-14 rounded-2xl overflow-hidden border-2 ${activeCommunityId === item.community?.id ? "border-[`#FF4D00`]" : "border-gray-50"}`}
              >
                {item.community?.banner_url ? (
                  <Image
                    source={{ uri: item.community.banner_url }}
                    className="w-full h-full"
                  />
                ) : (
                  <View className="w-full h-full bg-gray-50 items-center justify-center">
                    <Text className="text-gray-300 font-black italic">
                      {item.community?.name?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text
                className={`text-[10px] mt-1.5 font-black uppercase tracking-tighter text-center w-14 ${activeCommunityId === item.community?.id ? "text-black" : "text-gray-400"}`}
                numberOfLines={1}
              >
                {item.community?.name || "..."}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 2. MAIN CONTENT AREA */}
      <View className="flex-1">
        {activeCommunityId === null ? (
          /* --- DISCOVERY VIEW --- */
          <ScrollView
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[1]}
          >
            {/* Search Bar */}
            <View className="px-6 py-6">
              <View className="bg-gray-100 rounded-2xl px-4 flex-row items-center h-14">
                <Ionicons name="search" size={22} color="#6B7280" />
                <TextInput
                  placeholder="Find a community..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-3 text-lg text-black font-bold h-full py-0"
                  style={{ includeFontPadding: false }}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            {/* Categories */}
            <View className="bg-white py-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    className={`mr-3 px-6 py-3 rounded-2xl border ${selectedCategory === cat ? "bg-black border-black" : "bg-white border-gray-100 shadow-sm"}`}
                  >
                    <Text
                      className={`font-black text-sm uppercase tracking-widest ${selectedCategory === cat ? "text-white" : "text-gray-600"}`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Discover List */}
            <View className="px-6 pt-6 pb-20">
              <Text className="text-2xl font-black text-black mb-6">
                Discovery
              </Text>

              {isDiscoverLoading ? (
                <View className="py-20">
                  <ActivityIndicator color="#FF4D00" size="large" />
                </View>
              ) : discoverList.length === 0 ? (
                <View className="items-center py-20">
                  <Ionicons name="search-outline" size={60} color="#D1D5DB" />
                  <Text className="text-gray-400 font-bold mt-4 text-center">
                    {search ? "No results found" : "No new communities yet"}
                  </Text>
                </View>
              ) : (
                discoverList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setActiveCommunityId(item.id)}
                    className="bg-white rounded-[32px] mb-8 overflow-hidden shadow-sm border border-gray-100"
                  >
                    <View className="h-40 bg-gray-100">
                      {item.banner_url ? (
                        <Image
                          source={{ uri: item.banner_url }}
                          className="w-full h-full"
                        />
                      ) : (
                        <View className="w-full h-full bg-[#FF4D00]/10 items-center justify-center">
                          <Ionicons name="people" size={60} color="#FF4D00" />
                        </View>
                      )}
                      <View className="absolute top-4 left-4 bg-white/90 px-3 py-1.5 rounded-xl">
                        <Text className="text-[10px] font-black text-[#FF4D00] uppercase tracking-widest">
                          {item.category}
                        </Text>
                      </View>
                    </View>
                    <View className="p-6">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 mr-4">
                          <Text
                            className="text-2xl font-black text-black leading-7"
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text className="text-gray-400 font-black text-xs mt-1 uppercase tracking-tighter">
                            by @{item.creator?.username || "unknown"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleJoin(item.id)}
                          className="bg-black px-6 py-3 rounded-2xl shadow-lg"
                        >
                          <Text className="text-white font-black text-xs uppercase tracking-widest">
                            Join
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text
                        className="text-gray-500 text-base leading-6 mt-4"
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                      <View className="flex-row items-center mt-6 pt-6 border-t border-gray-50">
                        <Ionicons
                          name="people-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="text-gray-500 font-bold text-sm ml-2">
                          {item.members_count || 1} members
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        ) : (
          /* --- DETAIL VIEW --- */
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FF4D00"
              />
            }
          >
            {isDetailLoading ? (
              <View className="py-20">
                <ActivityIndicator color="#FF4D00" size="large" />
              </View>
            ) : !activeCommunity ? (
              <View className="items-center py-20 px-10">
                <Text className="text-xl font-black text-center mb-6">
                  Community not found
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveCommunityId(null)}
                  className="bg-black px-8 py-3 rounded-2xl"
                >
                  <Text className="text-white font-bold">Back to Discover</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {/* Banner & Title */}
                <View className="px-6 mb-8 pt-6">
                  <View className="h-48 bg-gray-100 rounded-[40px] overflow-hidden shadow-sm relative">
                    {activeCommunity.banner_url ? (
                      <Image
                        source={{ uri: activeCommunity.banner_url }}
                        className="w-full h-full"
                      />
                    ) : (
                      <View className="w-full h-full bg-[#FF4D00]/10 items-center justify-center">
                        <Ionicons name="people" size={80} color="#FF4D00" />
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => setActiveCommunityId(null)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-lg"
                    >
                      <Ionicons name="close" size={24} color="black" />
                    </TouchableOpacity>
                    <View className="absolute bottom-6 left-6 bg-white/95 px-4 py-2 rounded-2xl">
                      <Text className="text-xs font-black text-[#FF4D00] uppercase tracking-widest">
                        {activeCommunity.category}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-8">
                    <Text className="text-4xl font-black text-black leading-[44px]">
                      {activeCommunity.name}
                    </Text>
                    <View className="flex-row items-center mt-3">
                      <Text className="text-[`#FF4D00`] font-black text-base">
                        @{activeCommunity.creator?.username || "unknown"}
                      </Text>
                      <View className="w-1.5 h-1.5 rounded-full bg-gray-200 mx-4" />
                      <Text className="text-gray-400 font-bold text-base">
                        {activeCommunity.members_count || 1} members
                      </Text>
                    </View>
                    {activeCommunity.description && (
                      <Text className="text-gray-500 text-lg leading-7 mt-6">
                        {activeCommunity.description}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Feed */}
                <View className="px-6 pb-40">
                  <View className="flex-row items-center justify-between mb-8">
                    <Text className="text-2xl font-black text-black">Feed</Text>
                    <TouchableOpacity className="flex-row items-center bg-gray-50 px-4 py-2 rounded-xl">
                      <Text className="text-gray-400 font-bold text-xs mr-2 uppercase tracking-tighter">
                        Recent
                      </Text>
                      <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  {isLoadingFeed ? (
                    <ActivityIndicator color="#FF4D00" />
                  ) : posts.length === 0 ? (
                    <View className="py-20 items-center">
                      <Ionicons
                        name="chatbubbles-outline"
                        size={48}
                        color="#D1D5DB"
                      />
                      <Text className="text-gray-400 font-bold mt-4 text-center">
                        Empty space... Be the first to post!
                      </Text>
                    </View>
                  ) : (
                    posts.map((post: Post) => (
                      <View key={post.id} className="mb-10">
                        <View className="flex-row items-center mb-4">
                          <View className="w-12 h-12 rounded-2xl bg-[#FF4D00] overflow-hidden border border-gray-100 items-center justify-center shadow-sm">
                            {post.user?.profile_image_url ? (
                              <Image
                                source={{ uri: post.user.profile_image_url }}
                                className="w-full h-full"
                              />
                            ) : (
                              <Text className="text-white font-black italic text-lg">
                                {post.user?.username?.[0]?.toUpperCase()}
                              </Text>
                            )}
                          </View>
                          <View className="ml-4">
                            <Text className="font-black text-black text-base">
                              @{post.user?.username}
                            </Text>
                            <Text className="text-gray-400 text-xs font-bold uppercase tracking-tighter">
                              {post.created_at
                                ? new Date(post.created_at).toLocaleDateString()
                                : "Just now"}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-gray-800 text-lg leading-7 mb-5">
                          {post.content}
                        </Text>
                        {post.images && post.images.length > 0 && (
                          <View className="h-64 bg-gray-100 rounded-[32px] overflow-hidden mb-5 border border-gray-50">
                            <Image
                              source={{ uri: post.images[0] }}
                              className="w-full h-full"
                            />
                          </View>
                        )}
                        <View className="flex-row items-center">
                          <TouchableOpacity className="flex-row items-center mr-8">
                            <Ionicons
                              name={post.has_liked ? "heart" : "heart-outline"}
                              size={26}
                              color={post.has_liked ? "#FF4D00" : "#6B7280"}
                            />
                            <Text
                              className={`ml-2.5 font-black text-base ${post.has_liked ? "text-[#FF4D00]" : "text-gray-500"}`}
                            >
                              {post.likes_count || 0}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity className="flex-row items-center">
                            <Ionicons
                              name="chatbubble-outline"
                              size={24}
                              color="#6B7280"
                            />
                            <Text className="ml-2.5 text-gray-500 font-black text-base">
                              {post.comments_count || 0}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
