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
} from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCommunity,
  useJoinedCommunities,
  Community as CommunityType,
  Post,
} from "../../hooks/useCommunity";
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

  useFocusEffect(
    useCallback(() => {
      // Soft refresh only on focus gain, without triggering a loop on state changes
      refetchFeed();
    }, [refetchFeed])
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
        }
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
          [...prev, result.assets[0].uri].slice(0, 5)
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
          "Please allow access to your photo library."
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
          ]
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

    try {
      const imageUrls = await Promise.all(
        selectedImages.map((uri) => uploadImage(uri))
      );

      await createPost({
        content: postContent,
        community_id: selectedCommunity?.id || null,
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
    [isPostLikePending, likePost, unlikePost]
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
          />
        }
        ListFooterComponent={
          activeTab === "Profile" ? (
            <ProfileTab
              user={user}
              onEdit={() => {
                router.push({
                  pathname: "/profile-edit",
                  params: {
                    userId: currentUserId,
                    mode: "bio",
                    initialData: JSON.stringify(user.profile),
                  },
                });
              }}
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
  }: DashboardHeaderProps) => (
    <>
      <View className="px-6 pt-16 pb-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-2xl font-black text-black">Community</Text>
        <View className="flex-row gap-4">
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
          <View className="w-12 h-12 rounded-full bg-[#FF4D00] items-center justify-center">
            <Text className="text-white font-black text-lg">Me</Text>
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
        {["For You", "Profile"].map((tab: string) => (
          <TouchableOpacity
            key={tab}
            onPress={() => onTabChange(tab)}
            className="flex-1 py-4 items-center"
          >
            <Text
              className={`font-black uppercase tracking-widest text-[10px] ${activeTab === tab ? "text-black" : "text-gray-400"}`}
            >
              {tab}
            </Text>
            {activeTab === tab && (
              <View className="absolute bottom-0 w-12 h-1 bg-black rounded-full" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </>
  )
);

const ProfileTab = ({ user, onEdit }: any) => {
  const initials = user.profile?.full_name
    ? user.profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user.profile?.username?.charAt(0).toUpperCase() || "U";

  const isVerified = user.verification_status === "verified";

  return (
    <View className="px-6 pb-20 pt-4">
      {/* Header & Avatar Section */}
      <View className="items-center mb-10">
        <View className="relative">
          <View className="w-32 h-32 rounded-[3rem] bg-black items-center justify-center border-4 border-gray-50 shadow-2xl">
            <Text className="text-white text-4xl font-black">{initials}</Text>
          </View>
          <TouchableOpacity
            onPress={onEdit}
            className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-white items-center justify-center shadow-lg border border-gray-100"
          >
            <Ionicons name="settings-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>

        <View className="items-center mt-6">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-3xl font-black text-black text-center">
              {user.profile?.full_name || "Guest User"}
            </Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={20} color="#0095F6" />
            )}
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-gray-400 font-bold text-sm">
              @{user.profile?.username || "username"}
            </Text>
            <View className="w-1 h-1 rounded-full bg-gray-300" />
            <Text className="text-gray-900 font-black text-[10px] uppercase tracking-tighter bg-gray-100 px-2 py-0.5 rounded-full">
              {user.profile?.role || "Member"}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View className="flex-row bg-white border border-gray-100 rounded-[2.5rem] py-8 mb-10 shadow-sm">
        <View className="flex-1 items-center border-r border-gray-50">
          <Text className="text-2xl font-black text-black">
            {user.profile?.followers_count || 0}
          </Text>
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">
            Followers
          </Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-black text-black">
            {user.profile?.following_count || 0}
          </Text>
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">
            Following
          </Text>
        </View>
      </View>

      {/* Biography Card */}
      <View className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100/50">
        <View className="flex-row items-center gap-2 mb-4">
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#9CA3AF"
          />
          <Text className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">
            Biography
          </Text>
        </View>
        <Text className="text-black font-medium leading-7 text-[16px]">
          {user.profile?.bio ||
            "No bio available yet. Share your story with the community by updating your profile settings!"}
        </Text>
      </View>
    </View>
  );
};
