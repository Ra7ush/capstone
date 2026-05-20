import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ActionSheetIOS,
  Modal,
} from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCommunity,
  useJoinedCommunities,
  useCommunityDetail,
  useJoinRequests,
  usePendingRequestsCount,
  useHandleJoinRequest,
  Community as CommunityType,
  Post,
} from "../../hooks/useCommunity";
import { profileApi } from "../../lib/api";
import { useFollow } from "../../hooks/useFollow";
import { ImageViewer } from "../../components";
import { PostCard } from "./PostCard";
import { CommentsModal } from "./CommentsModal";
import { CommunityCreationModal } from "./CommunityCreationModal";

interface CommunityDashboardProps {
  currentUserId?: string;
  user: any;
  joinedCommunities: any[];
  isLoadingJoined: boolean;
  refreshAuth: () => void;
  initialCommunity?: CommunityType | null;
  isCreator: boolean;
  hasCreatorCommunity: boolean;
}

export const CommunityDashboard = ({
  currentUserId,
  user,
  joinedCommunities,
  isLoadingJoined,
  refreshAuth,
  initialCommunity,
  isCreator,
  hasCreatorCommunity,
}: CommunityDashboardProps) => {
  const [activeTab, setActiveTab] = useState("For You");
  const [postContent, setPostContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [commentsPost, setCommentsPost] = useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] =
    useState<CommunityType | null>(initialCommunity || null);
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);

  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    feed,
    isLoadingFeed,
    isRefetchingFeed,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetchFeed,
    createPost,
    isCreatingPost,
    likePost,
    unlikePost,
    isPostLikePending,
    uploadImage,
    deletePost,
    addComment,
    isAddingComment,
    deleteComment,
    likeComment,
    unlikeComment,
    createCommunity,
  } = useCommunity(selectedCommunity?.id);

  const { follow, unfollow } = useFollow();

  // Fetch fresh community detail for live members_count
  const { data: communityDetailData } = useCommunityDetail(
    selectedCommunity?.id || "",
  );
  const liveMembersCount =
    communityDetailData?.data?.members_count ??
    selectedCommunity?.members_count ??
    0;

  // Join request hooks (for private community creators)
  const isPrivateCommunity =
    isCreator && selectedCommunity?.privacy === "private";
  const { data: pendingCountData } = usePendingRequestsCount(
    isPrivateCommunity ? selectedCommunity?.id : undefined,
  );
  const { data: joinRequestsData, isLoading: isLoadingRequests } =
    useJoinRequests(
      isPrivateCommunity && activeTab === "Requests"
        ? selectedCommunity?.id
        : undefined,
    );
  const handleJoinRequestMutation = useHandleJoinRequest();

  const pendingCount = pendingCountData?.count || 0;
  const joinRequests = joinRequestsData?.data || [];

  const handleApproveRequest = async (requestId: string) => {
    try {
      await handleJoinRequestMutation.mutateAsync({
        requestId,
        action: "approve",
      });
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.error || "Failed to approve request",
      );
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await handleJoinRequestMutation.mutateAsync({
                requestId,
                action: "reject",
              });
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.response?.data?.error || "Failed to reject request",
              );
            }
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      // Soft refresh only on focus gain, without triggering a loop on state changes
      refetchFeed();
    }, [refetchFeed]),
  );

  // Fallback using Document Picker when Image Picker fails
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
    // On iOS, show options to choose method
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Photo Library", "Take Photo", "Browse Files"],
          cancelButtonIndex: 0,
          title: "Select Image",
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await pickFromLibrary();
          } else if (buttonIndex === 2) {
            await pickFromCamera();
          } else if (buttonIndex === 3) {
            await pickImageWithDocumentPicker();
          }
        },
      );
    } else {
      // Android - directly try image picker
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
          .filter((asset) => asset.uri && asset.uri.length > 0)
          .map((asset) => asset.uri);

        if (validImages.length > 0) {
          setSelectedImages((prev) => [...prev, ...validImages].slice(0, 5));
        }
      }
    } catch (error: any) {
      console.error("Error picking images:", error);

      // iOS PHPicker bug - offer Document Picker as fallback
      if (
        error?.message?.includes("public.jpeg") ||
        error?.message?.includes("public.heic") ||
        error?.message?.includes("representation")
      ) {
        Alert.alert(
          "Image Loading Issue",
          "There was a problem loading images from your photo library. Would you like to try the file browser instead?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Browse Files",
              onPress: async () => {
                const success = await pickImageWithDocumentPicker();
                if (!success) {
                  Alert.alert("Error", "Could not load images.");
                }
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", "Could not pick images. Please try again.");
      }
    }
  };

  const handlePost = async () => {
    if (!postContent.trim() && selectedImages.length === 0) {
      Alert.alert("Error", "Please add some content or an image");
      return;
    }

    if (!selectedCommunity?.id) {
      Alert.alert("Error", "Please select a community to post in");
      return;
    }

    try {
      const imageUrls = await Promise.all(
        selectedImages.map((uri) => uploadImage(uri)),
      );

      await createPost({
        content: postContent,
        community_id: selectedCommunity.id,
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
    if (userId === currentUserId) return;
    router.push({
      pathname: "/user-profile" as any,
      params: { userId },
    });
  };

  return (
    <View className="flex-1 bg-white">
      <ImageViewer
        visible={!!viewingImages}
        images={viewingImages || []}
        initialIndex={viewingIndex}
        onClose={() => setViewingImages(null)}
      />

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
          currentUserId={currentUserId}
          currentUserImage={
            user?.profile?.profile_image_url || user?.profile_image_url
          }
        />
      )}

      {isCreatingCommunity && (
        <CommunityCreationModal
          visible={isCreatingCommunity}
          onClose={() => setIsCreatingCommunity(false)}
          onCreate={createCommunity}
          uploadImage={uploadImage}
          onSuccess={(newCommunity) => {
            setSelectedCommunity(newCommunity);
            refreshAuth();
            queryClient.invalidateQueries({
              queryKey: ["communities", "joined"],
            });
          }}
        />
      )}

      <FlatList
        data={activeTab === "For You" ? feed : []}
        keyExtractor={(item: Post) => item.id}
        renderItem={({ item }: { item: Post }) => (
          <View className="px-6">
            <PostCard
              post={item}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDelete={handleDeletePost}
              onFollow={handleFollowAction}
              onOpenComments={handleOpenComments}
              onViewImages={handleViewImages}
              onViewProfile={handleViewProfile}
              isLikeLoading={isPostLikePending(item.id)}
            />
          </View>
        )}
        ListHeaderComponent={
          <DashboardHeader
            isCreator={isCreator}
            hasCreatorCommunity={hasCreatorCommunity}
            onOpenCreateCommunity={() => setIsCreatingCommunity(true)}
            joinedCommunities={joinedCommunities}
            selectedCommunity={selectedCommunity}
            onSelectCommunity={setSelectedCommunity}
            postContent={postContent}
            onPostContentChange={setPostContent}
            selectedImages={selectedImages}
            onRemoveImage={(index: number) =>
              setSelectedImages((prev) => prev.filter((_, i) => i !== index))
            }
            onPickImage={pickImage}
            onPost={handlePost}
            isCreatingPost={isCreatingPost}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            user={user}
            isPrivateCommunity={isPrivateCommunity}
            pendingCount={pendingCount}
            membersCount={liveMembersCount}
          />
        }
        ListFooterComponent={
          activeTab === "Profile" && user ? (
            <ProfileTab
              user={user}
              uploadImage={uploadImage}
              likePost={likePost}
              unlikePost={unlikePost}
              deletePost={deletePost}
              onOpenComments={handleOpenComments}
              onViewImages={handleViewImages}
              refreshAuth={refreshAuth}
              onEdit={() => {
                router.push({
                  pathname: "/profile-edit",
                  params: {
                    userId: currentUserId,
                    mode: "bio",
                    initialData: JSON.stringify(user?.profile),
                  },
                });
              }}
              // Comment modal props for ProfileTab's internal modal
              addComment={addComment}
              isAddingComment={isAddingComment}
              deleteComment={deleteComment}
              likeComment={likeComment}
              unlikeComment={unlikeComment}
              currentUserId={currentUserId}
              currentUserImage={
                user?.profile?.profile_image_url || user?.profile_image_url
              }
            />
          ) : activeTab === "Requests" ? (
            <RequestsTab
              joinRequests={joinRequests}
              isLoading={isLoadingRequests}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
              isPending={handleJoinRequestMutation.isPending}
            />
          ) : isFetchingNextPage ? (
            <ActivityIndicator size="small" color="#000" className="py-4" />
          ) : null
        }
        ListEmptyComponent={
          activeTab === "For You" && !isLoadingFeed ? (
            <View className="items-center py-12 px-6">
              <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 font-medium text-center mt-4">
                No posts yet. Be the first to share something!
              </Text>
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && activeTab === "For You") fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isLoadingFeed} onRefresh={refetchFeed} />
        }
      />
    </View>
  );
};

// --- Sub-components for stability ---

// Requests Tab - Join request management for private community creators
const RequestsTab = ({
  joinRequests,
  isLoading,
  onApprove,
  onReject,
  isPending,
}: {
  joinRequests: any[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) => {
  if (isLoading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator size="large" color="#000" />
        <Text className="text-gray-400 font-medium mt-4">
          Loading requests...
        </Text>
      </View>
    );
  }

  if (joinRequests.length === 0) {
    return (
      <View className="items-center py-16 px-6">
        <Ionicons name="people-outline" size={56} color="#D1D5DB" />
        <Text className="text-gray-800 font-bold text-lg mt-4">
          No Pending Requests
        </Text>
        <Text className="text-gray-400 text-center mt-2 leading-5">
          When someone requests to join your private community, they will appear
          here.
        </Text>
      </View>
    );
  }

  return (
    <View className="px-6 pb-8">
      <Text className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-6">
        {joinRequests.length} pending request
        {joinRequests.length !== 1 ? "s" : ""}
      </Text>
      {joinRequests.map((request: any) => (
        <View
          key={request.id}
          className="bg-white rounded-3xl p-5 mb-4 border border-gray-100"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center overflow-hidden">
              {request.user?.avatar_url ? (
                <Image
                  source={{ uri: request.user.avatar_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-gray-500 font-black text-lg">
                  {(request.user?.username || "?")[0].toUpperCase()}
                </Text>
              )}
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-black font-bold text-base">
                {request.user?.full_name || request.user?.username || "User"}
              </Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                @{request.user?.username || "unknown"} •{" "}
                {new Date(request.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {request.message && (
            <View className="mt-3 bg-gray-50 rounded-2xl p-3">
              <Text className="text-gray-600 text-sm leading-5">
                {request.message}
              </Text>
            </View>
          )}

          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              onPress={() => onApprove(request.id)}
              disabled={isPending}
              className={`flex-1 bg-black py-3 rounded-2xl items-center ${isPending ? "opacity-50" : ""}`}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-black text-xs uppercase tracking-widest">
                  Approve
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onReject(request.id)}
              disabled={isPending}
              className={`flex-1 bg-gray-100 py-3 rounded-2xl items-center ${isPending ? "opacity-50" : ""}`}
            >
              <Text className="text-gray-600 font-black text-xs uppercase tracking-widest">
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

interface DashboardHeaderProps {
  isCreator: boolean;
  hasCreatorCommunity: boolean;
  onOpenCreateCommunity: () => void;
  joinedCommunities: any[];
  selectedCommunity: CommunityType | null;
  onSelectCommunity: (c: CommunityType | null) => void;
  postContent: string;
  onPostContentChange: (t: string) => void;
  selectedImages: string[];
  onRemoveImage: (i: number) => void;
  onPickImage: () => void;
  onPost: () => void;
  isCreatingPost: boolean;
  activeTab: string;
  onTabChange: (t: string) => void;
  user: any;
  isPrivateCommunity: boolean;
  pendingCount: number;
  membersCount: number;
}

const DashboardHeader = React.memo(
  ({
    isCreator,
    hasCreatorCommunity,
    onOpenCreateCommunity,
    joinedCommunities,
    selectedCommunity,
    onSelectCommunity,
    postContent,
    onPostContentChange,
    selectedImages,
    onRemoveImage,
    onPickImage,
    onPost,
    isCreatingPost,
    activeTab,
    onTabChange,
    user,
    isPrivateCommunity,
    pendingCount,
    membersCount,
  }: DashboardHeaderProps) => {
      const tabs = isPrivateCommunity
        ? ["For You", "Requests", "Profile"]
        : ["For You", "Profile"];
      const insets = useSafeAreaInsets();

      return (
        <>
          <View 
            className="px-6 pb-4 bg-white border-b border-gray-100 flex-row items-center justify-between"
            style={{ paddingTop: Math.max(insets.top, 20) + 12 }}
          >
            <View>
            <Text className="text-2xl font-black text-black">Community</Text>
          </View>
          <View className="flex-row gap-2 items-center">
            {isCreator && selectedCommunity && (
              <View className="bg-gray-100 px-3 py-1.5 rounded-full flex-row items-center">
                <Ionicons name="people" size={12} color="#4B5563" />
                <Text className="text-xs font-bold text-gray-600 ml-1.5">
                  {membersCount} {membersCount === 1 ? "Member" : "Members"}
                </Text>
              </View>
            )}
            {isCreator && !hasCreatorCommunity && (
              <TouchableOpacity
                onPress={onOpenCreateCommunity}
                className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center"
              >
                <Ionicons name="add" size={24} color="black" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="px-6 py-6 border-b border-gray-100">
          <View className="flex-row gap-4">
            <View className="w-12 h-12 rounded-full bg-[#FF4D00] items-center justify-center overflow-hidden">
              {user?.profile?.profile_image_url || user?.profile_image_url ? (
                <Image
                  source={{
                    uri:
                      user?.profile?.profile_image_url ||
                      user?.profile_image_url,
                  }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-white font-black text-lg">Me</Text>
              )}
            </View>
            <View className="flex-1 bg-gray-50 rounded-3xl p-4 border border-gray-100">
              <TextInput
                placeholder="What's happening in your world?"
                placeholderTextColor="#9CA3AF"
                multiline
                className="text-black font-medium leading-5 mb-4 max-h-32 utf8-fix"
                value={postContent}
                onChangeText={onPostContentChange}
              />

              {selectedImages.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {selectedImages.map((uri: string, index: number) => (
                    <View key={index} className="mr-3 relative">
                      <Image
                        source={{ uri }}
                        className="w-40 h-40 rounded-xl"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"
                        onPress={() => onRemoveImage(index)}
                      >
                        <Ionicons name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View className="flex-row items-center justify-between">
                <TouchableOpacity onPress={onPickImage}>
                  <Ionicons name="image-outline" size={24} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  className={`bg-black px-6 py-2 rounded-full ${isCreatingPost ? "opacity-50" : ""}`}
                  onPress={onPost}
                  disabled={isCreatingPost}
                >
                  {isCreatingPost ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white font-black text-sm">Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View className="flex-row border-b border-gray-100 mb-8">
          {tabs.map((tab: string) => (
            <TouchableOpacity
              key={tab}
              onPress={() => onTabChange(tab)}
              className="flex-1 py-4 items-center"
            >
              <View className="flex-row items-center">
                <Text
                  className={`font-black uppercase tracking-widest text-[10px] ${activeTab === tab ? "text-black" : "text-gray-400"}`}
                >
                  {tab}
                </Text>
                {tab === "Requests" && pendingCount > 0 && (
                  <View className="ml-1.5 bg-[#FF4D00] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                    <Text className="text-white font-black text-[9px]">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </Text>
                  </View>
                )}
              </View>
              {activeTab === tab && (
                <View className="absolute bottom-0 w-12 h-1 bg-black rounded-full" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  },
);

DashboardHeader.displayName = "DashboardHeader";

const ProfileTab = ({
  user,
  onEdit,
  uploadImage,
  likePost,
  unlikePost,
  deletePost,
  onOpenComments,
  onViewImages,
  refreshAuth,
  // Comment modal props for ProfileTab's internal modal
  addComment,
  isAddingComment,
  deleteComment,
  likeComment,
  unlikeComment,
  currentUserId,
  currentUserImage,
}: any) => {
  const [coverImage, setCoverImage] = useState<string | null>(
    user?.profile?.cover_image_url || null,
  );
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsStats, setPostsStats] = useState({ total: 0, totalLikes: 0 });
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(
    null,
  );
  const [loadingLikeId, setLoadingLikeId] = useState<string | null>(null);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  // Local state for comments modal inside ProfileTab's full-screen modal
  const [commentsPost, setCommentsPost] = useState<string | null>(null);

  const router = useRouter();

  const initials = user?.profile?.full_name
    ? user.profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user?.profile?.username?.charAt(0).toUpperCase() || "U";

  const isVerified = user?.verification_status === "verified";
  const category = user?.profile?.category || "Creator";

  // Fetch user posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const userId = user?.id || user?.profile?.id;
        if (!userId) return;

        const result = await profileApi.getUserPosts(userId, { limit: 30 });
        const enrichedPosts = (result.posts || []).map((post: any) => ({
          ...post,
          user_id: userId,
          user: {
            id: userId,
            username: user?.profile?.username || user?.username,
            full_name: user?.profile?.full_name || user?.full_name,
            profile_image_url:
              user?.profile?.profile_image_url || user?.profile_image_url,
            verification_status: user?.verification_status,
          },
        }));
        setPosts(enrichedPosts);
        setPostsStats({
          total: result.total || 0,
          totalLikes: result.totalLikes || 0,
        });
      } catch (error) {
        console.error("Error fetching user posts:", error);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [user?.id, user?.profile?.id]);

  const handlePickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setIsUploadingCover(true);
        const uploadedUrl = await uploadImage(result.assets[0].uri);

        // Update profile with new cover image
        const userId = user?.id || user?.profile?.id;
        await profileApi.updateProfile(userId, {
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
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setIsUploadingProfile(true);
        const uploadedUrl = await uploadImage(result.assets[0].uri);

        // Update profile with new profile image
        const userId = user?.id || user?.profile?.id;
        await profileApi.updateProfile(userId, {
          profile_image_url: uploadedUrl,
        });

        if (refreshAuth) {
          refreshAuth();
        }

        Alert.alert("Success", "Profile photo updated!");
      }
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      Alert.alert("Error", "Failed to update profile photo");
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleLocalLike = async (post: Post) => {
    if (loadingLikeId) return;
    setLoadingLikeId(post.id);

    try {
      if (post.has_liked) {
        await unlikePost(post.id);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, has_liked: false, likes_count: p.likes_count - 1 }
              : p,
          ),
        );
      } else {
        await likePost(post.id);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, has_liked: true, likes_count: p.likes_count + 1 }
              : p,
          ),
        );
      }
    } catch (error) {
      console.error("Like error:", error);
    } finally {
      setLoadingLikeId(null);
    }
  };

  const handleLocalDelete = (postId: string) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            // Close modal if deleted post was selected
            setSelectedPostIndex((currentIndex) => {
              if (currentIndex === null) return null;
              // Use setPosts callback to access current posts
              return null; // Simplify: close modal on any delete from profile
            });
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <View className="pb-20">
      {/* Full Screen Post Feed Modal */}
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
            <Text className="font-bold text-lg">Posts</Text>
            <View className="w-7" />
          </View>

          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            initialScrollIndex={selectedPostIndex || 0}
            getItemLayout={(data, index) => ({
              length: 500, // Approximate height
              offset: 500 * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              const wait = new Promise((resolve) => setTimeout(resolve, 500));
              wait.then(() => {
                // If scroll fails, valid fallback
              });
            }}
            renderItem={({ item }) => (
              <View className="px-6 mb-6">
                <PostCard
                  post={item}
                  currentUserId={user?.id || user?.profile?.id}
                  onLike={handleLocalLike}
                  onDelete={handleLocalDelete}
                  onFollow={() => {}} // No follow needed on own profile
                  onOpenComments={setCommentsPost}
                  onViewImages={onViewImages}
                  isLikeLoading={loadingLikeId === item.id}
                />
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
          />
          {/* Comments Modal rendered inside the full-screen modal to appear on top */}
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
              currentUserId={currentUserId}
              currentUserImage={currentUserImage}
            />
          )}
        </View>
      </Modal>

      {/* Cover Photo Section */}
      <TouchableOpacity
        onPress={handlePickCoverImage}
        disabled={isUploadingCover}
        activeOpacity={0.8}
      >
        <View className="h-44 bg-gradient-to-b from-green-200 to-green-100 relative">
          {coverImage ? (
            <Image
              source={{ uri: coverImage }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-gradient-to-br from-emerald-200 via-green-200 to-teal-100" />
          )}

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-12 left-4 w-10 h-10 rounded-full bg-black/30 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Camera overlay for editing */}
          <View className="absolute inset-0 items-center justify-center">
            {isUploadingCover ? (
              <ActivityIndicator size="large" color="white" />
            ) : (
              <View className="bg-black/20 px-4 py-2 rounded-full flex-row items-center">
                <Ionicons name="camera-outline" size={18} color="white" />
                <Text className="text-white font-medium ml-2 text-xs">
                  Tap to change cover
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Profile Info Section */}
      <View className="px-5 -mt-10">
        {/* Profile Image + Name Row */}
        <View className="flex-row items-end mb-4">
          {/* Profile Picture */}
          <View className="relative">
            <TouchableOpacity
              onPress={handlePickProfileImage}
              disabled={isUploadingProfile}
              activeOpacity={0.8}
              className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden items-center justify-center relative"
            >
              {user?.profile?.profile_image_url ? (
                <Image
                  source={{ uri: user.profile.profile_image_url }}
                  className="w-full h-full"
                />
              ) : (
                <View className="w-full h-full bg-black items-center justify-center">
                  <Text className="text-white text-2xl font-black">
                    {initials}
                  </Text>
                </View>
              )}

              {isUploadingProfile && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center">
                  <ActivityIndicator color="white" size="small" />
                </View>
              )}

              <View className="absolute bottom-0 w-full h-5 bg-black/40 items-center justify-center">
                <Ionicons name="camera" size={10} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Name + Username */}
          <View className="ml-4 flex-1 translate-y-1">
            <View className="flex-row items-center">
              <Text className="text-xl font-black text-black">
                {user.profile?.full_name || "Guest User"}
              </Text>
              {isVerified && (
                <View className="ml-1.5 w-5 h-5 rounded-full bg-green-500 items-center justify-center">
                  <Ionicons name="checkmark" size={12} color="white" />
                </View>
              )}
            </View>
            <Text className="text-gray-400 text-sm">
              @{user.profile?.username || "username"}
            </Text>
          </View>
        </View>

        {/* Profile Image (Moved out of flow for better positioning control or keep as is?
            Original was flex-row items-end.
            I need to modify the PREVIOUS block actually, lines 830-845)
            Wait, I should target lines 830-845 specifically.
        */}

        {/* Stats Row */}
        <View className="flex-row border border-gray-100 rounded-2xl py-4 px-2 mb-5 bg-white">
          <View className="flex-1 items-center border-r border-gray-100">
            <Text className="text-lg font-black text-black">
              {user.profile?.followers_count || 0}
            </Text>
            <Text className="text-gray-400 text-xs font-medium">Followers</Text>
          </View>
          <View className="flex-1 items-center border-r border-gray-100">
            <Text className="text-lg font-black text-black">
              {user.profile?.following_count || 0}
            </Text>
            <Text className="text-gray-400 text-xs font-medium">Following</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-lg font-black text-black">
              {postsStats.total}
            </Text>
            <Text className="text-gray-400 text-xs font-medium">Posts</Text>
          </View>
        </View>

        {/* Bio */}
        <Text className="text-gray-600 text-sm leading-5 mb-5">
          {user.profile?.bio ||
            "I make videos about life in different countries. Subscribe so as not to miss a single video!"}
        </Text>

        {/* Edit Profile Button */}
        <TouchableOpacity
          onPress={onEdit}
          className="bg-black py-3.5 rounded-full items-center mb-6"
        >
          <Text className="text-white font-bold">Edit Profile</Text>
        </TouchableOpacity>

        {/* Posts Grid */}
        <View className="mb-4">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Your Posts
          </Text>

          {isLoadingPosts ? (
            <ActivityIndicator size="small" color="#000" className="py-8" />
          ) : posts.length > 0 ? (
            <View className="flex-row flex-wrap -mx-0.5">
              {posts.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  className="w-[33.33%] aspect-square p-0.5"
                  onPress={() => setSelectedPostIndex(index)}
                >
                  {post.images?.[0] ? (
                    <Image
                      source={{ uri: post.images[0] }}
                      className="w-full h-full rounded-lg"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-full bg-gray-100 rounded-lg items-center justify-center p-2">
                      <Text
                        className="text-gray-400 text-[10px] text-center"
                        numberOfLines={3}
                      >
                        {post.content?.substring(0, 50) || "Post"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="items-center py-8">
              <Ionicons name="images-outline" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 font-medium mt-3">
                No posts yet
              </Text>
              <Text className="text-gray-300 text-sm">
                Share your first post!
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
