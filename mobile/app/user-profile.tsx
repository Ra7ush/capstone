import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  FlatList,
  Modal,
  Alert,
  Platform,
  ActionSheetIOS,
  TextInput,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthState } from "@/hooks/useAuthState";
import { profileApi, followApi, reportApi } from "@/lib/api";
import { useBlockUser } from "@/hooks/useBlocking";
import { formatTimeAgo } from "@/lib/utils";
import { ImageViewer } from "@/components/ImageViewer";

const SCREEN_WIDTH = Dimensions.get("window").width;
const IMAGE_SIZE = (SCREEN_WIDTH - 48 - 4) / 3; // 3 columns with 2px gap

export default function UserProfile() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: authUser } = useAuthState();
  const currentUserId = authUser?.id;
  const isOwnProfile = userId === currentUserId;

  // Profile data
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Posts
  const [posts, setPosts] = useState<any[]>([]);
  const [postsStats, setPostsStats] = useState({
    total: 0,
    totalLikes: 0,
  });
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [localFollowersCount, setLocalFollowersCount] = useState(0);

  // View state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(
    null,
  );
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);

  // Refs
  const postsModalFlatListRef = useRef<FlatList>(null);

  // Followers/Following modal
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [socialModalType, setSocialModalType] = useState<
    "followers" | "following"
  >("followers");
  const [socialList, setSocialList] = useState<any[]>([]);
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);

  // Report modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Block hook
  const blockMutation = useBlockUser();

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await profileApi.getProfile(userId);
      setProfile(data);
      setLocalFollowersCount(data?.followers_count || 0);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await profileApi.getUserPosts(userId, { limit: 30 });
      setPosts(result.posts || []);
      setPostsStats({
        total: result.total || 0,
        totalLikes: result.totalLikes || 0,
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [userId]);

  const checkFollowStatus = useCallback(async () => {
    if (!userId || isOwnProfile) return;
    try {
      const result = await followApi.checkFollowing(userId);
      setIsFollowing(result.isFollowing);
    } catch (error) {
      console.error("Error checking follow:", error);
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    checkFollowStatus();
  }, [fetchProfile, fetchPosts, checkFollowStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchPosts(), checkFollowStatus()]);
    setRefreshing(false);
  };

  const handleFollowToggle = async () => {
    if (!userId || isFollowLoading) return;
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await followApi.unfollow(userId);
        setIsFollowing(false);
        setLocalFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await followApi.follow(userId);
        setIsFollowing(true);
        setLocalFollowersCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleOpenSocialModal = async (type: "followers" | "following") => {
    setSocialModalType(type);
    setSocialModalVisible(true);
    setIsLoadingSocial(true);
    try {
      const data =
        type === "followers"
          ? await followApi.getFollowers(userId!)
          : await followApi.getFollowing(userId!);
      setSocialList(data || []);
    } catch (error) {
      console.error("Error fetching social list:", error);
    } finally {
      setIsLoadingSocial(false);
    }
  };

  const handleMessageUser = () => {
    router.push({
      pathname: "/chat/[id]",
      params: { id: userId! },
    });
  };

  const REPORT_REASONS = [
    "Harassment",
    "Spam",
    "Inappropriate Content",
    "Impersonation",
    "Scam / Fraud",
    "Other",
  ];

  const handleThreeDotMenu = () => {
    if (isOwnProfile) return;

    const options = ["Block User", "Report User", "Cancel"];
    const cancelIndex = 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: 0,
          cancelButtonIndex: cancelIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handleBlockUser();
          if (buttonIndex === 1) setReportModalVisible(true);
        },
      );
    } else {
      Alert.alert("Options", undefined, [
        {
          text: "Block User",
          style: "destructive",
          onPress: handleBlockUser,
        },
        {
          text: "Report User",
          onPress: () => setReportModalVisible(true),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      "Block User",
      `Are you sure you want to block @${profile?.username}? They won't be able to see your profile or message you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockMutation.mutateAsync(userId!);
              Alert.alert("Blocked", `@${profile?.username} has been blocked.`);
              router.back();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.message || "Failed to block user.",
              );
            }
          },
        },
      ],
    );
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      Alert.alert("Required", "Please select a reason for your report.");
      return;
    }
    setIsSubmittingReport(true);
    try {
      await reportApi.submitReport({
        reported_user_id: userId!,
        content_type: "user",
        reason: reportReason,
        description: reportDescription || undefined,
      });
      setReportModalVisible(false);
      setReportReason("");
      setReportDescription("");
      Alert.alert(
        "Report Submitted",
        "Thank you for your report. Our team will review it shortly.",
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to submit report.";
      Alert.alert("Error", msg);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : profile?.username?.charAt(0).toUpperCase() || "U";

  const isVerified = profile?.verification_status === "verified";

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="black" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="person-outline" size={48} color="#D1D5DB" />
        <Text className="text-gray-400 mt-4 font-bold">User not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 bg-black px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Bar */}
      <View className="px-4 pt-14 pb-3 bg-white border-b border-gray-100 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-base font-black text-black">
            @{profile.username}
          </Text>
        </View>
        {!isOwnProfile ? (
          <TouchableOpacity
            onPress={handleThreeDotMenu}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <Ionicons name="ellipsis-vertical" size={20} color="black" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Cover Photo */}
        <View className="h-40 bg-gray-100">
          {profile.cover_image_url ? (
            <Image
              source={{ uri: profile.cover_image_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-gradient-to-r from-gray-900 to-gray-700 items-center justify-center">
              <View className="w-full h-full bg-black/80" />
            </View>
          )}
        </View>

        {/* Profile Info */}
        <View className="px-5 -mt-12">
          {/* Avatar */}
          <View className="flex-row items-end mb-4">
            <View className="w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden shadow-lg">
              {profile.profile_image_url ? (
                <Image
                  source={{ uri: profile.profile_image_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full bg-black items-center justify-center">
                  <Text className="text-white text-3xl font-black">
                    {initials}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons (right-aligned) */}
            {!isOwnProfile && (
              <View className="flex-1 flex-row justify-end items-center gap-2 mb-1">
                <TouchableOpacity
                  onPress={handleFollowToggle}
                  disabled={isFollowLoading}
                  className={`px-6 py-2.5 rounded-full ${
                    isFollowing
                      ? "bg-gray-100 border border-gray-200"
                      : "bg-black"
                  }`}
                >
                  {isFollowLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowing ? "black" : "white"}
                    />
                  ) : (
                    <Text
                      className={`font-bold text-sm ${
                        isFollowing ? "text-black" : "text-white"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleMessageUser}
                  className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 items-center justify-center"
                >
                  <Ionicons name="chatbubble-outline" size={18} color="black" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Name + Verification */}
          <View className="mb-1">
            <View className="flex-row items-center">
              <Text className="text-xl font-black text-black">
                {profile.full_name || profile.username}
              </Text>
              {isVerified && (
                <View className="ml-1.5 w-5 h-5 rounded-full bg-blue-500 items-center justify-center">
                  <Ionicons name="checkmark" size={12} color="white" />
                </View>
              )}
            </View>
            <Text className="text-gray-400 text-sm font-medium">
              @{profile.username}
            </Text>
          </View>

          {/* Role Badge */}
          {profile.role === "creator" && (
            <View className="flex-row mt-2 mb-3">
              <View className="bg-[#FF4D00] px-3 py-1 rounded-full">
                <Text className="text-white text-[10px] font-black uppercase">
                  Creator
                </Text>
              </View>
              {profile.category && (
                <View className="bg-gray-100 px-3 py-1 rounded-full ml-2">
                  <Text className="text-gray-600 text-[10px] font-black uppercase">
                    {profile.category}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Bio */}
          {profile.bio && (
            <Text className="text-gray-600 text-sm leading-5 mt-2 mb-4">
              {profile.bio}
            </Text>
          )}

          {/* Stats Row */}
          <View className="flex-row border border-gray-100 rounded-2xl py-4 px-2 my-4 bg-white">
            <TouchableOpacity
              onPress={() => handleOpenSocialModal("followers")}
              className="flex-1 items-center border-r border-gray-100"
            >
              <Text className="text-lg font-black text-black">
                {localFollowersCount}
              </Text>
              <Text className="text-gray-400 text-xs font-medium">
                Followers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleOpenSocialModal("following")}
              className="flex-1 items-center border-r border-gray-100"
            >
              <Text className="text-lg font-black text-black">
                {profile.following_count || 0}
              </Text>
              <Text className="text-gray-400 text-xs font-medium">
                Following
              </Text>
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-lg font-black text-black">
                {postsStats.total}
              </Text>
              <Text className="text-gray-400 text-xs font-medium">Posts</Text>
            </View>
          </View>

          {/* View Toggle */}
          <View className="flex-row border-b border-gray-100 mb-4">
            <TouchableOpacity
              onPress={() => setViewMode("grid")}
              className={`flex-1 items-center py-3 ${
                viewMode === "grid" ? "border-b-2 border-black" : ""
              }`}
            >
              <Ionicons
                name="grid-outline"
                size={22}
                color={viewMode === "grid" ? "black" : "#9CA3AF"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              className={`flex-1 items-center py-3 ${
                viewMode === "list" ? "border-b-2 border-black" : ""
              }`}
            >
              <Ionicons
                name="list-outline"
                size={22}
                color={viewMode === "list" ? "black" : "#9CA3AF"}
              />
            </TouchableOpacity>
          </View>

          {/* Posts */}
          {isLoadingPosts ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="black" />
            </View>
          ) : posts.length === 0 ? (
            <View className="py-16 items-center">
              <Ionicons name="camera-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4 font-bold text-base">
                No posts yet
              </Text>
            </View>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <View className="flex-row flex-wrap" style={{ gap: 2 }}>
              {posts.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  onPress={() => setSelectedPostIndex(index)}
                  style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
                  className="bg-gray-100 overflow-hidden"
                >
                  {post.images && post.images.length > 0 ? (
                    <View className="w-full h-full">
                      <Image
                        source={{ uri: post.images[0] }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      {post.images.length > 1 && (
                        <View className="absolute top-2 right-2">
                          <Ionicons
                            name="copy-outline"
                            size={16}
                            color="white"
                          />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View className="w-full h-full bg-gray-50 p-2 justify-center">
                      <Text
                        className="text-gray-600 text-[10px] leading-3"
                        numberOfLines={5}
                      >
                        {post.content}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            /* List View */
            <View>
              {posts.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  onPress={() => setSelectedPostIndex(index)}
                  className="mb-4 pb-4 border-b border-gray-50"
                >
                  <Text
                    className="text-gray-800 text-sm mb-2"
                    numberOfLines={3}
                  >
                    {post.content}
                  </Text>
                  {post.images && post.images.length > 0 && (
                    <View className="rounded-xl overflow-hidden h-48">
                      <Image
                        source={{ uri: post.images[0] }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  <View className="flex-row items-center mt-2 gap-4">
                    <View className="flex-row items-center gap-1">
                      <Ionicons
                        name={post.has_liked ? "heart" : "heart-outline"}
                        size={16}
                        color={post.has_liked ? "#EF4444" : "#9CA3AF"}
                      />
                      <Text className="text-gray-400 text-xs">
                        {post.likes_count || 0}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Ionicons
                        name="chatbubble-outline"
                        size={14}
                        color="#9CA3AF"
                      />
                      <Text className="text-gray-400 text-xs">
                        {post.comments_count || 0}
                      </Text>
                    </View>
                    <Text className="text-gray-300 text-xs ml-auto">
                      {formatTimeAgo(post.created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Bottom spacing */}
          <View className="h-20" />
        </View>
      </ScrollView>

      {/* Post Detail Modal */}
      <Modal
        visible={selectedPostIndex !== null}
        animationType="slide"
        onRequestClose={() => setSelectedPostIndex(null)}
      >
        <View className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="pt-14 px-4 pb-4 border-b border-gray-100 flex-row items-center justify-between bg-white">
            <TouchableOpacity onPress={() => setSelectedPostIndex(null)}>
              <Ionicons name="chevron-back" size={28} color="black" />
            </TouchableOpacity>
            <Text className="font-bold text-lg">Posts</Text>
            <View className="w-7" />
          </View>

          <FlatList
            ref={postsModalFlatListRef}
            data={posts}
            keyExtractor={(item) => item.id}
            onLayout={() => {
              // Scroll to selected post after layout is complete
              if (selectedPostIndex !== null && selectedPostIndex > 0) {
                setTimeout(() => {
                  postsModalFlatListRef.current?.scrollToIndex({
                    index: selectedPostIndex,
                    animated: false,
                    viewPosition: 0,
                  });
                }, 100);
              }
            }}
            onScrollToIndexFailed={(info) => {
              // Fallback: scroll to offset if index fails
              const wait = new Promise((resolve) => setTimeout(resolve, 100));
              wait.then(() => {
                postsModalFlatListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: false,
                });
              });
            }}
            renderItem={({ item }) => (
              <View className="border-b border-gray-100 pb-4 mb-4">
                {/* Post header */}
                <View className="flex-row items-center gap-3 px-4 py-3">
                  <View className="w-10 h-10 rounded-full bg-black items-center justify-center overflow-hidden">
                    {profile.profile_image_url ? (
                      <Image
                        source={{ uri: profile.profile_image_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-white font-bold">{initials}</Text>
                    )}
                  </View>
                  <View>
                    <View className="flex-row items-center gap-1">
                      <Text className="font-black text-sm">
                        @{profile.username}
                      </Text>
                      {isVerified && (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#3B82F6"
                        />
                      )}
                    </View>
                    <Text className="text-gray-400 text-xs">
                      {formatTimeAgo(item.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Post content */}
                {item.content && (
                  <Text className="px-4 text-gray-800 text-sm mb-3">
                    {item.content}
                  </Text>
                )}

                {/* Post images */}
                {item.images && item.images.length > 0 && (
                  <FlatList
                    data={item.images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, i) => i.toString()}
                    renderItem={({ item: imageUri, index }) => (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                          setViewingImages(item.images);
                          setViewingIndex(index);
                        }}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={{
                            width: SCREEN_WIDTH,
                            height: SCREEN_WIDTH,
                          }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}
                  />
                )}

                {/* Post stats */}
                <View className="flex-row items-center gap-5 px-4 pt-3">
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name={item.has_liked ? "heart" : "heart-outline"}
                      size={22}
                      color={item.has_liked ? "#EF4444" : "#6B7280"}
                    />
                    <Text className="text-gray-600 text-sm font-bold">
                      {item.likes_count || 0}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name="chatbubble-outline"
                      size={20}
                      color="#6B7280"
                    />
                    <Text className="text-gray-600 text-sm font-bold">
                      {item.comments_count || 0}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Followers/Following Modal */}
      <Modal
        visible={socialModalVisible}
        animationType="slide"
        onRequestClose={() => setSocialModalVisible(false)}
      >
        <View className="flex-1 bg-white">
          <View className="pt-14 px-4 pb-4 border-b border-gray-100 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => setSocialModalVisible(false)}>
              <Ionicons name="chevron-back" size={28} color="black" />
            </TouchableOpacity>
            <Text className="font-bold text-lg capitalize">
              {socialModalType}
            </Text>
            <View className="w-7" />
          </View>

          {isLoadingSocial ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="black" />
            </View>
          ) : socialList.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4 font-bold">
                No {socialModalType} yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={socialList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSocialModalVisible(false);
                    if (item.id !== currentUserId) {
                      router.push({
                        pathname: "/user-profile" as any,
                        params: { userId: item.id },
                      });
                    }
                  }}
                  className="flex-row items-center py-3 border-b border-gray-50"
                >
                  <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center overflow-hidden">
                    {item.profile_image_url ? (
                      <Image
                        source={{ uri: item.profile_image_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-gray-500 font-bold text-lg">
                        {item.username?.charAt(0).toUpperCase() || "U"}
                      </Text>
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="font-bold text-black text-sm">
                      {item.full_name || item.username}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      @{item.username}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        onRequestClose={() => {
          setReportModalVisible(false);
          setReportReason("");
          setReportDescription("");
        }}
      >
        <View className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="pt-14 px-4 pb-4 border-b border-gray-100 flex-row items-center justify-between bg-white">
            <TouchableOpacity
              onPress={() => {
                setReportModalVisible(false);
                setReportReason("");
                setReportDescription("");
              }}
            >
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
            <Text className="font-black text-lg">Report User</Text>
            <View className="w-7" />
          </View>

          <ScrollView className="flex-1 px-5 pt-6">
            {/* User being reported */}
            <View className="flex-row items-center mb-6 p-4 bg-gray-50 rounded-2xl">
              <View className="w-12 h-12 rounded-full bg-black items-center justify-center overflow-hidden">
                {profile?.profile_image_url ? (
                  <Image
                    source={{ uri: profile.profile_image_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    {initials}
                  </Text>
                )}
              </View>
              <View className="ml-3">
                <Text className="font-bold text-black">
                  {profile?.full_name || profile?.username}
                </Text>
                <Text className="text-gray-400 text-xs">
                  @{profile?.username}
                </Text>
              </View>
            </View>

            {/* Reason Selection */}
            <Text className="font-black text-sm text-black mb-3">
              Why are you reporting this user?
            </Text>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                onPress={() => setReportReason(reason)}
                className={`flex-row items-center p-4 mb-2 rounded-xl border ${
                  reportReason === reason
                    ? "border-black bg-black/5"
                    : "border-gray-100 bg-white"
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                    reportReason === reason
                      ? "border-black bg-black"
                      : "border-gray-300"
                  }`}
                >
                  {reportReason === reason && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
                <Text
                  className={`font-medium text-sm ${
                    reportReason === reason ? "text-black" : "text-gray-600"
                  }`}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Description */}
            <Text className="font-black text-sm text-black mt-5 mb-3">
              Additional details (optional)
            </Text>
            <TextInput
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="Provide more context about this report..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="border border-gray-200 rounded-xl p-4 text-sm text-black min-h-[100px] bg-gray-50"
            />

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmitReport}
              disabled={!reportReason || isSubmittingReport}
              className={`mt-6 mb-10 py-4 rounded-full items-center ${
                reportReason && !isSubmittingReport
                  ? "bg-red-500"
                  : "bg-gray-200"
              }`}
            >
              {isSubmittingReport ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  className={`font-black text-base ${
                    reportReason ? "text-white" : "text-gray-400"
                  }`}
                >
                  Submit Report
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Image Viewer */}
      {viewingImages && (
        <ImageViewer
          visible={!!viewingImages}
          images={viewingImages}
          initialIndex={viewingIndex}
          onClose={() => setViewingImages(null)}
        />
      )}
    </View>
  );
}
