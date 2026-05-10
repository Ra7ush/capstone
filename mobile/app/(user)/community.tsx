import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  ActionSheetIOS,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { PostCard } from "@/components/community/PostCard";
import { ImageViewer } from "@/components";
import { useAuthState } from "@/hooks/useAuthState";
import {
  useDiscoverCommunities,
  useCommunity,
  useJoinedCommunities,
  useCommunityDetail,
  useRequestToJoin,
  useCancelJoinRequest,
  Post,
} from "@/hooks/useCommunity";
import { useFollow } from "@/hooks/useFollow";
import { profileApi } from "@/lib/api";
import { CommentsModal } from "@/components/community/CommentsModal";

const CATEGORIES = [
  "All",
  "Art",
  "Health",
  "Gaming",
  "Tech",
  "Business",
  "Lifestyle",
  "Education",
  "General",
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
  const { data: joinedData } = useJoinedCommunities();

  // Selected Community Detail Data
  const { data: detailData, isLoading: isDetailLoading } = useCommunityDetail(
    activeCommunityId || "",
  );
  const {
    feed,
    isLoadingFeed,
    refetchFeed,
    joinCommunity,
    leaveCommunity,
    createPost,
    isCreatingPost,
    uploadImage,
    likePost,
    unlikePost,
    isPostLikePending,
    deletePost,
    addComment,
    isAddingComment,
    deleteComment,
    likeComment,
    unlikeComment,
  } = useCommunity(activeCommunityId || "");

  const { follow, unfollow } = useFollow();

  const requestToJoinMutation = useRequestToJoin();
  const cancelJoinRequestMutation = useCancelJoinRequest();

  const { user: authUser, refresh: refreshAuth } = useAuthState();
  const router = useRouter();

  // Posting State
  const [postContent, setPostContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [commentsPost, setCommentsPost] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Feed"); // "Feed" or "Profile"

  // Profile Specific State (Redesign)
  const [coverImage, setCoverImage] = useState<string | null>(
    authUser?.profile?.cover_image_url || null,
  );
  useEffect(() => {
    if (authUser?.profile?.cover_image_url) {
      setCoverImage(authUser.profile.cover_image_url);
    }
  }, [authUser?.profile?.cover_image_url]);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsStats, setPostsStats] = useState({ total: 0, totalLikes: 0 });
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(
    null,
  );
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);

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

  const handleJoin = async (community: any) => {
    try {
      if (community.privacy === "private") {
        // If already pending, cancel the request
        if (community.join_request_status === "pending") {
          Alert.alert(
            "Cancel Request",
            `Cancel your join request for "${community.name}"?`,
            [
              { text: "No", style: "cancel" },
              {
                text: "Cancel Request",
                style: "destructive",
                onPress: async () => {
                  try {
                    await cancelJoinRequestMutation.mutateAsync(community.id);
                  } catch (e: any) {
                    Alert.alert(
                      "Error",
                      e?.response?.data?.error ||
                        "Failed to cancel request. Try again.",
                    );
                  }
                },
              },
            ],
          );
          return;
        }
        // Send join request
        try {
          await requestToJoinMutation.mutateAsync({
            communityId: community.id,
          });
          Alert.alert(
            "Request Sent",
            `Your request to join "${community.name}" has been sent to the creator.`,
          );
        } catch (e: any) {
          Alert.alert(
            "Error",
            e?.response?.data?.error ||
              "Failed to send request. Please try again.",
          );
        }
        return;
      }
      await joinCommunity(community.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeave = async (id: string) => {
    if (!id) return;
    Alert.alert(
      "Leave Community",
      "Are you sure you want to leave this community? You will no longer see its posts in your feed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveCommunity(id);
              setActiveCommunityId(null); // Return to discover after leaving
            } catch (e) {
              console.error(e);
              Alert.alert(
                "Error",
                "Failed to leave community. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const pickImageWithDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets
          .filter((asset) => asset.mimeType?.startsWith("image/"))
          .map((asset) => asset.uri)
          .slice(0, 5 - selectedImages.length);

        if (imageUris.length > 0) {
          setSelectedImages((prev) => [...prev, ...imageUris].slice(0, 5));
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const pickImage = async () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Photo Library", "Take Photo", "Browse Files"],
          cancelButtonIndex: 0,
          title: "Select Image",
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) await pickFromLibrary();
          else if (buttonIndex === 2) await pickFromCamera();
          else if (buttonIndex === 3) await pickImageWithDocumentPicker();
        },
      );
    } else {
      await pickFromLibrary();
    }
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        exif: false,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedImages((prev) =>
          [...prev, result.assets[0].uri].slice(0, 5),
        );
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Could not access camera.");
    }
  };

  const pickFromLibrary = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 5 - selectedImages.length,
        quality: 0.7,
        exif: false,
      });
      if (!result.canceled && result.assets) {
        const validImages = result.assets
          .filter((asset) => asset.uri)
          .map((asset) => asset.uri);
        if (validImages.length > 0) {
          setSelectedImages((prev) => [...prev, ...validImages].slice(0, 5));
        }
      }
    } catch (error: any) {
      console.error("Error picking images:", error);
      Alert.alert("Error", "Could not pick images. Please try again.");
    }
  };

  const handlePost = async () => {
    if (!postContent.trim() && selectedImages.length === 0) {
      Alert.alert("Error", "Please add some content or an image");
      return;
    }

    if (!activeCommunityId) {
      Alert.alert("Error", "Please select a community to post in");
      return;
    }

    try {
      const imageUrls = await Promise.all(
        selectedImages.map((uri) => uploadImage(uri)),
      );
      await createPost({
        content: postContent,
        community_id: activeCommunityId,
        images: imageUrls,
      });
      setPostContent("");
      setSelectedImages([]);
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post");
    }
  };

  const handleLike = useCallback(
    async (post: Post) => {
      // Skip if this is an optimistic post (hasn't been saved to server yet)
      if (post.id.startsWith("temp-")) {
        return;
      }

      // Per-post lock check - prevents rapid multiple clicks on the same post
      if (isPostLikePending(post.id)) {
        return;
      }

      try {
        if (post.has_liked) {
          await unlikePost(post.id);
        } else {
          await likePost(post.id);
        }
      } catch (error) {
        // Silently ignore MUTATION_IN_PROGRESS errors (expected when double-clicking)
        if (
          error instanceof Error &&
          error.message === "MUTATION_IN_PROGRESS"
        ) {
          return;
        }
        console.error("Like error:", error);
      }
    },
    [isPostLikePending, likePost, unlikePost],
  );

  const handleDeletePost = (postId: string) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePost(postId),
      },
    ]);
  };

  const handleFollowAction = async (post: Post) => {
    try {
      if (post.is_following) {
        await unfollow(post.user_id);
      } else {
        await follow(post.user_id);
      }
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

  const handleOpenComments = (postId: string) => setCommentsPost(postId);

  const handleViewImages = (images: string[], index: number) => {
    setViewingImages(images);
    setViewingIndex(index);
  };

  const handleViewProfile = (userId: string) => {
    // If it's the current user, switch to Profile tab
    if (userId === authUser?.id) {
      setActiveTab("Profile");
      return;
    }

    router.push({
      pathname: "/user-profile" as any,
      params: { userId },
    });
  };

  // Profile Tab Logic
  const fetchUserPosts = useCallback(async () => {
    try {
      if (!authUser?.id) return;
      setIsLoadingPosts(true);
      const result = await profileApi.getUserPosts(authUser.id, { limit: 50 });
      const posts = result.posts || [];
      setUserPosts(posts);
      setPostsStats({
        total: result.total || posts.length,
        totalLikes: result.totalLikes || 0,
      });
    } catch (error) {
      console.error("Error fetching user posts:", error);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (activeTab === "Profile") {
      fetchUserPosts();
    }
  }, [activeTab, fetchUserPosts]);

  const handlePickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        if (!authUser?.id) return;
        setIsUploadingCover(true);
        const uploadedUrl = await uploadImage(result.assets[0].uri);
        await profileApi.updateProfile(authUser.id, {
          cover_image_url: uploadedUrl,
        });
        setCoverImage(uploadedUrl);
        Alert.alert("Success", "Cover photo updated!");
      }
    } catch (error) {
      console.error("Error uploading cover:", error);
      Alert.alert("Error", "Failed to update cover photo");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handlePickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        if (!authUser?.id) return;
        setIsUploadingProfile(true);
        const uploadedUrl = await uploadImage(result.assets[0].uri);
        await profileApi.updateProfile(authUser.id, {
          profile_image_url: uploadedUrl,
        });
        refreshAuth();
        Alert.alert("Success", "Profile photo updated!");
      }
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      Alert.alert("Error", "Failed to update profile photo");
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const joinedList = joinedData?.data || [];
  const discoverList = discoverData?.data || [];
  const activeCommunity = detailData?.data;
  const isJoined = joinedList.some(
    (item) => (item.community?.id || item.community_id) === activeCommunityId,
  );

  const profileTabContent = (
    <View className="pb-40">
      {/* Cover Photo */}
      <TouchableOpacity
        onPress={handlePickCoverImage}
        disabled={isUploadingCover}
        activeOpacity={0.8}
      >
        <View className="h-44 bg-gray-100 relative">
          {coverImage ? (
            <Image source={{ uri: coverImage }} className="w-full h-full" />
          ) : (
            <View className="w-full h-full bg-[#FF4D00]/5 items-center justify-center">
              <Ionicons name="image-outline" size={32} color="#FF4D00" />
            </View>
          )}
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
          >
            {isUploadingCover ? (
              <ActivityIndicator size="small" color="#FF4D00" />
            ) : (
              <View
                className="px-3 py-1.5 rounded-full flex-row items-center shadow-sm"
                style={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  elevation: 2,
                }}
              >
                <Ionicons name="camera" size={14} color="black" />
                <Text className="text-black font-bold text-[10px] ml-1.5 uppercase tracking-tighter">
                  Edit Cover
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Profile Info Overlay */}
      <View className="px-6 -mt-10">
        <View className="flex-row items-end mb-6">
          <TouchableOpacity
            onPress={handlePickProfileImage}
            disabled={isUploadingProfile}
            activeOpacity={0.8}
            className="w-24 h-24 rounded-[32px] bg-white border-4 border-white shadow-xl items-center justify-center overflow-hidden"
          >
            {authUser?.profile?.profile_image_url ? (
              <Image
                source={{ uri: authUser.profile.profile_image_url }}
                className="w-full h-full"
              />
            ) : (
              <View className="w-full h-full bg-[#FF4D00] items-center justify-center">
                <Text className="text-white text-3xl font-black italic">
                  {authUser?.profile?.username?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            {isUploadingProfile && (
              <View
                className="absolute inset-0 items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
              >
                <ActivityIndicator color="white" size="small" />
              </View>
            )}
          </TouchableOpacity>

          <View className="ml-5 flex-1 mb-2">
            <Text className="text-2xl font-black text-black italic tracking-tighter">
              {authUser?.profile?.full_name || authUser?.profile?.username}
            </Text>
            <Text className="text-gray-400 font-bold text-base">
              @{authUser?.profile?.username}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row bg-gray-50 rounded-3xl p-5 mb-8 border border-gray-100">
          <View className="flex-1 items-center border-r border-gray-200">
            <Text className="text-xl font-black text-black">
              {authUser?.profile?.followers_count || 0}
            </Text>
            <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">
              Followers
            </Text>
          </View>
          <View className="flex-1 items-center border-r border-gray-200">
            <Text className="text-xl font-black text-black">
              {authUser?.profile?.following_count || 0}
            </Text>
            <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">
              Following
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-xl font-black text-black">
              {postsStats.total}
            </Text>
            <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">
              Posts
            </Text>
          </View>
        </View>

        {/* Bio */}
        {authUser?.profile?.bio && (
          <Text className="text-gray-500 font-medium text-base leading-6 mb-8 px-2">
            {authUser.profile.bio}
          </Text>
        )}

        {/* Posts Grid */}
        <View>
          <Text className="text-lg font-black text-black mb-4 px-2 uppercase tracking-tight">
            My Engagement
          </Text>

          {isLoadingPosts ? (
            <ActivityIndicator size="large" color="#FF4D00" className="py-20" />
          ) : userPosts.length > 0 ? (
            <View className="flex-row flex-wrap">
              {userPosts.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  className="w-[33.33%] aspect-square p-0.5"
                  onPress={() => setSelectedPostIndex(index)}
                >
                  {post.images?.[0] ? (
                    <Image
                      source={{ uri: post.images[0] }}
                      className="w-full h-full rounded-xl"
                    />
                  ) : (
                    <View className="w-full h-full bg-gray-50 rounded-xl items-center justify-center p-3">
                      <Text
                        className="text-gray-300 text-[10px] font-bold text-center"
                        numberOfLines={3}
                      >
                        {post.content}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="py-20 items-center bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
              <Ionicons name="images-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 font-bold mt-4">No posts yet</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <ImageViewer
        visible={!!viewingImages}
        images={viewingImages || []}
        initialIndex={viewingIndex}
        onClose={() => setViewingImages(null)}
      />

      {/* Post Detail Modal (Grid View) */}
      <Modal
        visible={selectedPostIndex !== null}
        animationType="slide"
        onRequestClose={() => setSelectedPostIndex(null)}
      >
        <View className="flex-1 bg-white">
          <View className="pt-12 px-4 pb-4 border-b border-gray-100 flex-row items-center justify-between bg-white z-10">
            <TouchableOpacity onPress={() => setSelectedPostIndex(null)}>
              <Ionicons name="chevron-back" size={28} color="black" />
            </TouchableOpacity>
            <Text className="font-bold text-lg">My Posts</Text>
            <View className="w-7" />
          </View>

          <FlatList
            data={userPosts}
            keyExtractor={(item) => item.id}
            initialScrollIndex={selectedPostIndex || 0}
            getItemLayout={(data, index) => ({
              length: 500,
              offset: 500 * index,
              index,
            })}
            renderItem={({ item }) => (
              <View className="px-6 mb-6">
                <PostCard
                  post={item}
                  currentUserId={authUser?.id}
                  onLike={handleLike}
                  onDelete={handleDeletePost}
                  onFollow={() => {}}
                  onOpenComments={handleOpenComments}
                  onViewImages={handleViewImages}
                  onViewProfile={handleViewProfile}
                  isLikeLoading={isPostLikePending(item.id)}
                />
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
          />
        </View>
      </Modal>

      {commentsPost && (
        <CommentsModal
          visible={!!commentsPost}
          onClose={() => setCommentsPost(null)}
          postId={commentsPost}
          addComment={addComment}
          isAddingComment={isAddingComment}
          deleteComment={deleteComment}
          likeComment={likeComment}
          unlikeComment={unlikeComment}
          currentUserId={authUser?.id}
          currentUserImage={
            authUser?.profile?.profile_image_url || authUser?.profile_image_url
          }
        />
      )}

      {/* 1. TOP SWITCHER (Discovery + Joined Avatars) */}
      {/* 1. TOP NAVIGATION (Discovery/Profile Tabs + Community Scroll) */}
      <View className="pt-14 pb-4 px-6 bg-white border-b border-gray-50">
        {/* Main Tabs (Discover | Profile) */}
        <View className="flex-row items-center mb-6 gap-3">
          <TouchableOpacity
            onPress={() => {
              setActiveCommunityId(null);
              setActiveTab("Feed");
            }}
            className={`flex-1 h-14 rounded-2xl flex-row items-center justify-center border-2 ${activeCommunityId === null && activeTab === "Feed" ? "border-[#FF4D00]" : "border-gray-50 bg-gray-50"}`}
            style={
              activeCommunityId === null && activeTab === "Feed"
                ? { backgroundColor: "rgba(255, 77, 0, 0.05)" }
                : undefined
            }
          >
            <Ionicons
              name="compass"
              size={20}
              color={
                activeCommunityId === null && activeTab === "Feed"
                  ? "#FF4D00"
                  : "#9CA3AF"
              }
            />
            <Text
              className={`ml-2 text-xs font-black uppercase tracking-widest ${activeCommunityId === null && activeTab === "Feed" ? "text-[#FF4D00]" : "text-gray-400"}`}
            >
              Discover
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveCommunityId(null);
              setActiveTab("Profile");
            }}
            className={`flex-1 h-14 rounded-2xl flex-row items-center justify-center border-2 ${activeCommunityId === null && activeTab === "Profile" ? "border-[#FF4D00]" : "border-gray-50 bg-gray-50"}`}
            style={
              activeCommunityId === null && activeTab === "Profile"
                ? { backgroundColor: "rgba(255, 77, 0, 0.05)" }
                : undefined
            }
          >
            <Ionicons
              name="person"
              size={20}
              color={
                activeCommunityId === null && activeTab === "Profile"
                  ? "#FF4D00"
                  : "#9CA3AF"
              }
            />
            <Text
              className={`ml-2 text-xs font-black uppercase tracking-widest ${activeCommunityId === null && activeTab === "Profile" ? "text-[#FF4D00]" : "text-gray-400"}`}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Communities Section */}
        <View className="flex-row items-center">
          <View className="mr-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-gray-300">
              Hubs
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {joinedList.map((item, index) => (
              <View
                key={
                  item.community?.id || item.community_id || `joined-${index}`
                }
                className="items-center mr-5"
              >
                <TouchableOpacity
                  onPress={() => {
                    const communityId = item.community?.id || item.community_id;
                    if (communityId) {
                      setActiveCommunityId(communityId);
                      setActiveTab("Feed"); // Default to Feed when switching communities
                    }
                  }}
                  className={`w-12 h-12 rounded-2xl overflow-hidden border-2 ${activeCommunityId === item.community?.id ? "border-[#FF4D00]" : "border-gray-50"}`}
                >
                  {item.community?.banner_url ? (
                    <Image
                      source={{ uri: item.community.banner_url }}
                      className="w-full h-full"
                    />
                  ) : (
                    <View className="w-full h-full bg-gray-50 items-center justify-center">
                      <Text className="text-gray-300 font-black italic text-xs">
                        {item.community?.name?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text
                  className={`text-[8px] mt-1 font-black uppercase tracking-tighter text-center w-12 ${activeCommunityId === item.community?.id ? "text-black" : "text-gray-400"}`}
                  numberOfLines={1}
                >
                  {item.community?.name || "..."}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* 2. MAIN CONTENT AREA */}
      <View className="flex-1">
        {activeCommunityId === null ? (
          /* --- DISCOVERY OR GLOBAL PROFILE --- */
          activeTab === "Profile" ? (
            /* Reuse the redesigned profile view */
            <ScrollView showsVerticalScrollIndicator={false}>
              {profileTabContent}
            </ScrollView>
          ) : (
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
                      className={`mr-3 px-6 py-3 rounded-2xl border ${selectedCategory === cat ? "bg-black border-black" : "bg-white border-gray-100"}`}
                      style={
                        selectedCategory !== cat
                          ? {
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 2,
                              elevation: 2,
                            }
                          : undefined
                      }
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
                      className="bg-white rounded-[32px] mb-8 overflow-hidden border border-gray-100"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                    >
                      <View className="h-40 bg-gray-100">
                        {item.banner_url ? (
                          <Image
                            source={{ uri: item.banner_url }}
                            className="w-full h-full"
                          />
                        ) : (
                          <View
                            className="w-full h-full items-center justify-center"
                            style={{ backgroundColor: "rgba(255, 77, 0, 0.1)" }}
                          >
                            <Ionicons name="people" size={60} color="#FF4D00" />
                          </View>
                        )}
                        <View className="absolute top-4 left-4 flex-row gap-2">
                          <View
                            className="px-3 py-1.5 rounded-xl"
                            style={{
                              backgroundColor: "rgba(255, 255, 255, 0.9)",
                            }}
                          >
                            <Text className="text-[10px] font-black text-[#FF4D00] uppercase tracking-widest">
                              {item.category}
                            </Text>
                          </View>
                          <View
                            className="px-3 py-1.5 rounded-xl flex-row items-center"
                            style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
                          >
                            <Ionicons
                              name={
                                item.privacy === "private"
                                  ? "lock-closed"
                                  : "globe"
                              }
                              size={10}
                              color="white"
                            />
                            <Text className="text-[10px] font-black text-white uppercase tracking-widest ml-1.5">
                              {item.privacy}
                            </Text>
                          </View>
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
                            onPress={() => handleJoin(item)}
                            disabled={item.is_joined}
                            className={`px-6 py-3 rounded-2xl shadow-lg ${
                              item.is_joined
                                ? "bg-gray-200"
                                : item.join_request_status === "pending"
                                  ? "bg-amber-500"
                                  : item.join_request_status === "rejected"
                                    ? "bg-red-500"
                                    : "bg-black"
                            }`}
                          >
                            <Text
                              className={`font-black text-xs uppercase tracking-widest ${
                                item.is_joined
                                  ? "text-gray-500"
                                  : item.join_request_status === "pending"
                                    ? "text-white"
                                    : "text-white"
                              }`}
                            >
                              {item.is_joined
                                ? "Joined"
                                : item.join_request_status === "pending"
                                  ? "Pending"
                                  : item.join_request_status === "rejected"
                                    ? "Request Again"
                                    : item.privacy === "private"
                                      ? "Request"
                                      : "Join"}
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
          )
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
                  <View
                    className="h-48 rounded-[40px] overflow-hidden relative border border-gray-100"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                      backgroundColor: "#F3F4F6",
                    }}
                  >
                    {activeCommunity.banner_url ? (
                      <Image
                        source={{ uri: activeCommunity.banner_url }}
                        className="w-full h-full"
                      />
                    ) : (
                      <View
                        className="w-full h-full items-center justify-center"
                        style={{ backgroundColor: "rgba(255, 77, 0, 0.1)" }}
                      >
                        <Ionicons name="people" size={80} color="#FF4D00" />
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => setActiveCommunityId(null)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 5,
                      }}
                    >
                      <Ionicons name="close" size={24} color="black" />
                    </TouchableOpacity>
                    <View className="absolute bottom-6 left-6 flex-row gap-2">
                      <View
                        className="px-4 py-2 rounded-2xl"
                        style={{ backgroundColor: "rgba(255, 255, 255, 0.95)" }}
                      >
                        <Text className="text-xs font-black text-[#FF4D00] uppercase tracking-widest">
                          {activeCommunity.category}
                        </Text>
                      </View>
                      <View
                        className="px-4 py-2 rounded-2xl flex-row items-center"
                        style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
                      >
                        <Ionicons
                          name={
                            activeCommunity.privacy === "private"
                              ? "lock-closed"
                              : "globe"
                          }
                          size={12}
                          color="white"
                        />
                        <Text className="text-xs font-black text-white uppercase tracking-widest ml-2">
                          {activeCommunity.privacy}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="mt-8">
                    <Text className="text-4xl font-black text-black leading-[44px]">
                      {activeCommunity.name}
                    </Text>
                    <View className="flex-row items-center justify-between mt-3">
                      <View className="flex-row items-center">
                        <Text className="text-[#FF4D00] font-black text-base">
                          @{activeCommunity.creator?.username || "unknown"}
                        </Text>
                        <View className="w-1.5 h-1.5 rounded-full bg-gray-200 mx-4" />
                        <Text className="text-gray-400 font-bold text-base">
                          {activeCommunity.members_count || 1} members
                        </Text>
                      </View>
                      {!isJoined ? (
                        <TouchableOpacity
                          onPress={() => handleJoin(activeCommunity)}
                          className="bg-black px-6 py-2 rounded-2xl"
                          style={{
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            elevation: 5,
                          }}
                        >
                          <Text className="text-white font-black text-xs uppercase tracking-widest">
                            {activeCommunity.privacy === "private"
                              ? "Request"
                              : "Join"}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        // Show Leave button only if user is NOT the creator
                        activeCommunity.creator_id !== authUser?.id && (
                          <TouchableOpacity
                            onPress={() => handleLeave(activeCommunity.id)}
                            className="bg-gray-100 px-6 py-2 rounded-2xl"
                          >
                            <Text className="text-gray-500 font-black text-xs uppercase tracking-widest">
                              Leave
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                    {activeCommunity.description && (
                      <Text className="text-gray-500 text-lg leading-7 mt-6">
                        {activeCommunity.description}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Feed */}
                <View className="px-6 pb-40 mt-4">
                  <View className="flex-row items-center justify-between mb-8">
                    <Text className="text-2xl font-black text-black">Feed</Text>
                  </View>

                  {/* Posting Area (Condition: Member or Joined) */}
                  {isJoined ? (
                    <View className="mb-10 bg-gray-50 rounded-3xl p-5 border border-gray-100">
                      <View className="flex-row gap-4 mb-4">
                        <View className="w-10 h-10 rounded-2xl bg-[#FF4D00] items-center justify-center overflow-hidden">
                          {authUser?.profile?.profile_image_url ? (
                            <Image
                              source={{
                                uri: authUser.profile.profile_image_url,
                              }}
                              className="w-full h-full"
                            />
                          ) : (
                            <Text className="text-white font-black italic">
                              {authUser?.profile?.username?.[0]?.toUpperCase() ||
                                "M"}
                            </Text>
                          )}
                        </View>
                        <TextInput
                          placeholder="Share something with the community..."
                          placeholderTextColor="#9CA3AF"
                          multiline
                          className="flex-1 text-black font-bold text-base leading-6 pt-2 h-20 utf8-fix"
                          style={{ includeFontPadding: false }}
                          value={postContent}
                          onChangeText={setPostContent}
                        />
                      </View>

                      {selectedImages.length > 0 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          className="mb-4"
                        >
                          {selectedImages.map((uri, index) => (
                            <View key={index} className="mr-3 relative">
                              <Image
                                source={{ uri }}
                                className="w-32 h-32 rounded-2xl"
                              />
                              <TouchableOpacity
                                className="absolute top-2 right-2 w-7 h-7 rounded-full items-center justify-center"
                                style={{
                                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                                }}
                                onPress={() =>
                                  setSelectedImages((prev) =>
                                    prev.filter((_, i) => i !== index),
                                  )
                                }
                              >
                                <Ionicons
                                  name="close"
                                  size={14}
                                  color="white"
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      )}

                      <View className="flex-row items-center justify-between">
                        <TouchableOpacity
                          onPress={pickImage}
                          className="bg-white w-10 h-10 rounded-full items-center justify-center border border-gray-100"
                          style={{
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                        >
                          <Ionicons name="image" size={20} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handlePost}
                          disabled={isCreatingPost}
                          className="bg-black px-6 py-2.5 rounded-2xl"
                          style={[
                            {
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.2,
                              shadowRadius: 8,
                              elevation: 5,
                            },
                            isCreatingPost ? { opacity: 0.3 } : undefined,
                          ]}
                        >
                          {isCreatingPost ? (
                            <ActivityIndicator color="white" size="small" />
                          ) : (
                            <Text className="text-white font-black text-xs uppercase tracking-widest">
                              Post
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View
                      className="mb-10 rounded-3xl p-6 border border-[#FF4D00]/10 items-center"
                      style={{ backgroundColor: "rgba(255, 77, 0, 0.05)" }}
                    >
                      <Ionicons name="lock-closed" size={32} color="#FF4D00" />
                      <Text className="text-black font-black text-lg mt-3 text-center">
                        Join this community to post
                      </Text>
                      <Text className="text-gray-500 font-medium text-sm mt-1 text-center">
                        See what is happening and share your own updates.
                      </Text>
                    </View>
                  )}

                  {isLoadingFeed ? (
                    <View className="py-20">
                      <ActivityIndicator color="#FF4D00" size="large" />
                    </View>
                  ) : feed.length === 0 ? (
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
                    feed.map((post: Post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={authUser?.id}
                        onLike={handleLike}
                        onDelete={handleDeletePost}
                        onFollow={handleFollowAction}
                        onOpenComments={handleOpenComments}
                        onViewImages={handleViewImages}
                        onViewProfile={handleViewProfile}
                        isLikeLoading={isPostLikePending(post.id)}
                      />
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
