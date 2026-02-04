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
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef, useCallback, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCommunity,
  usePostComments,
  Post,
  useCommunityDetail,
} from "../../hooks/useCommunity";
import { useFollow } from "../../hooks/useFollow";
import { ImageViewer } from "../../components";
import { useAuthState } from "../../hooks/useAuthState";
import { formatTimeAgo } from "../../lib/utils";

// PostCard sub-component
const PostCard = memo(
  ({
    post,
    currentUserId,
    onLike,
    onDelete,
    onFollow,
    onOpenComments,
    onViewImages,
    isLikeLoading = false,
  }: {
    post: Post;
    currentUserId?: string;
    onLike: (post: Post) => void;
    onDelete: (id: string) => void;
    onFollow: (post: Post) => void;
    onOpenComments: (id: string) => void;
    onViewImages: (images: string[], index: number) => void;
    isLikeLoading?: boolean;
  }) => {
    return (
      <View className="mb-8 border-b border-gray-50 pb-8">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-black/5 items-center justify-center overflow-hidden">
              {post.user?.avatar_url ? (
                <Image
                  source={{ uri: post.user.avatar_url }}
                  className="w-full h-full"
                />
              ) : (
                <Text className="text-black font-black text-xs">
                  {post.user?.username?.charAt(0).toUpperCase() || "U"}
                </Text>
              )}
            </View>
            <View>
              <View className="flex-row items-center gap-2">
                <Text className="text-black font-black text-sm">
                  @{post.user?.username || "unknown"}
                </Text>
                {post.user_id !== currentUserId && (
                  <>
                    <Text className="text-gray-300">•</Text>
                    <TouchableOpacity onPress={() => onFollow(post)}>
                      <Text
                        className={`${
                          post.is_following ? "text-gray-400" : "text-[#0095F6]"
                        } font-bold text-sm`}
                      >
                        {post.is_following ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              <Text className="text-gray-400 text-xs font-medium">
                {formatTimeAgo(post.created_at)}
              </Text>
            </View>
          </View>
        </View>

        <Text className="text-gray-800 font-medium leading-6 mb-4">
          {post.content}
        </Text>

        {post.images && post.images.length > 0 && (
          <View className="mb-4">
            <FlatList
              data={post.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_: string, i: number) => i.toString()}
              renderItem={({
                item,
                index,
              }: {
                item: string;
                index: number;
              }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => onViewImages(post.images!, index)}
                  style={{
                    width: Dimensions.get("window").width - 48,
                    height: 300,
                  }}
                >
                  <Image
                    source={{ uri: item }}
                    className="w-full h-full rounded-[2.5rem]"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View className="flex-row items-center gap-8">
          <TouchableOpacity
            className={`flex-row items-center gap-2 ${isLikeLoading ? "opacity-50" : ""}`}
            onPress={() => !isLikeLoading && onLike(post)}
            disabled={isLikeLoading}
          >
            <Ionicons
              name={post.has_liked ? "heart" : "heart-outline"}
              size={22}
              color={post.has_liked ? "#EF4444" : "#6B7280"}
            />
            <Text
              className={`${post.has_liked ? "text-red-500" : "text-gray-500"} font-bold text-xs`}
            >
              {post.likes_count || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center gap-2"
            onPress={() => onOpenComments(post.id)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
            <Text className="text-gray-500 font-bold text-xs">
              {post.comments_count || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

// CommentsModal sub-component (Simplified but functional)
function CommentsModal({
  visible,
  onClose,
  postId,
  addComment,
  isAddingComment,
  deleteComment,
  likeComment,
  unlikeComment,
  currentUserId,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  addComment: (args: {
    postId: string;
    content: string;
    parentId?: string;
  }) => Promise<any>;
  isAddingComment: boolean;
  deleteComment: (args: { postId: string; commentId: string }) => Promise<any>;
  likeComment: (args: { commentId: string; postId: string }) => Promise<any>;
  unlikeComment: (args: { commentId: string; postId: string }) => Promise<any>;
  currentUserId?: string;
}) {
  const [newComment, setNewComment] = useState("");
  const { data: comments, isLoading, refetch } = usePostComments(postId);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment({ postId, content: newComment.trim() });
      setNewComment("");
    } catch {
      Alert.alert("Error", "Failed to post comment");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60">
        <TouchableOpacity className="flex-1" onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="bg-white rounded-t-[3rem] h-[80vh]"
        >
          <View className="items-center py-4 border-b border-gray-100">
            <View className="w-10 h-1 bg-gray-200 rounded-full mb-4" />
            <Text className="font-black uppercase tracking-widest text-xs">
              Comments
            </Text>
          </View>
          <ScrollView className="flex-1 px-6 pt-4">
            {isLoading ? (
              <ActivityIndicator color="black" />
            ) : (
              comments?.map((c) => (
                <View key={c.id} className="flex-row mb-6">
                  <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                    <Text className="font-bold text-[10px]">
                      {c.user?.username?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-xs">
                      <Text className="font-black">@{c.user?.username} </Text>
                      <Text className="text-gray-400">
                        {formatTimeAgo(c.created_at)}
                      </Text>
                    </Text>
                    <Text className="text-gray-800 font-medium mt-1">
                      {c.content}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      c.has_liked
                        ? unlikeComment({ commentId: c.id, postId })
                        : likeComment({ commentId: c.id, postId })
                    }
                  >
                    <Ionicons
                      name={c.has_liked ? "heart" : "heart-outline"}
                      size={14}
                      color={c.has_liked ? "#EF4444" : "#D1D5DB"}
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
          <View className="p-6 border-t border-gray-100 pb-10 flex-row items-center">
            <TextInput
              className="flex-1 bg-gray-50 p-4 rounded-2xl font-bold"
              placeholder="Write a comment..."
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isAddingComment}
              className="ml-4"
            >
              <Text className="text-[#0095F6] font-black uppercase text-xs">
                Post
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function CommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthState();
  const currentUserId = session?.user?.id;

  const { data: communityData, isLoading: isLoadingDetail } =
    useCommunityDetail(id);
  const community = communityData?.data;

  const {
    feed,
    isLoadingFeed,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetchFeed,
    likePost,
    isLikingPost,
    unlikePost,
    isUnlikingPost,
    joinCommunity,
    addComment,
    isAddingComment,
    deleteComment,
    likeComment,
    unlikeComment,
  } = useCommunity(id);

  const { follow, unfollow } = useFollow();
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [commentsPost, setCommentsPost] = useState<string | null>(null);
  const pendingLikesRef = useRef<Set<string>>(new Set());

  const handleRefresh = async () => {
    await Promise.all([
      refetchFeed(),
      queryClient.invalidateQueries({
        queryKey: ["communities", "detail", id],
      }),
    ]);
  };

  const handleLike = useCallback(
    async (post: Post) => {
      // Layer 1: Disable while mutation is pending
      if (isLikingPost || isUnlikingPost) return;

      if (post.has_liked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
    },
    [likePost, unlikePost, isLikingPost, isUnlikingPost]
  );

  const handleFollow = useCallback(
    async (post: Post) => {
      try {
        post.is_following
          ? await unfollow(post.user_id)
          : await follow(post.user_id);
      } catch (e) {}
    },
    [follow, unfollow]
  );

  const handleJoin = async () => {
    try {
      await joinCommunity(id);
      Alert.alert("Success", "You have joined this community!");
    } catch (e) {
      Alert.alert("Error", "Failed to join");
    }
  };

  if (isLoadingDetail || !community) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="black" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
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

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-6">
            <PostCard
              post={item}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDelete={() => {}}
              onFollow={handleFollow}
              onOpenComments={setCommentsPost}
              onViewImages={(imgs, idx) => {
                setViewingImages(imgs);
                setViewingIndex(idx);
              }}
              isLikeLoading={isLikingPost || isUnlikingPost}
            />
          </View>
        )}
        ListHeaderComponent={
          <>
            {/* Header / Banner UI */}
            <View className="relative">
              <View className="h-64 bg-gray-100">
                {community.banner_url ? (
                  <Image
                    source={{ uri: community.banner_url }}
                    className="w-full h-full"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-black/5">
                    <Text className="text-black/10 font-black text-8xl italic">
                      NICHE
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => router.back()}
                className="absolute top-16 left-6 w-12 h-12 rounded-full bg-white/90 items-center justify-center shadow-lg"
              >
                <Ionicons name="chevron-back" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <View className="px-8 -mt-12 mb-12 bg-white rounded-t-[3rem] pt-10">
              <View className="flex-row justify-between items-start mb-6">
                <View className="flex-1 mr-4">
                  <Text className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
                    {community.category}
                  </Text>
                  <Text className="text-4xl font-black italic tracking-tighter mt-1">
                    {community.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleJoin}
                  className="bg-black px-10 py-4 rounded-[2rem] shadow-xl"
                >
                  <Text className="text-white font-black uppercase text-[10px] tracking-widest">
                    Join
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-gray-400 font-bold leading-6 mb-8">
                {community.description}
              </Text>

              <View className="flex-row items-center gap-6 py-6 border-y border-gray-50">
                <View className="items-center">
                  <Text className="text-black font-black text-xl italic">
                    {community.members_count}
                  </Text>
                  <Text className="text-gray-400 font-black uppercase text-[8px] tracking-widest mt-1">
                    Members
                  </Text>
                </View>
                <View className="w-px h-8 bg-gray-100" />
                <View>
                  <Text className="text-gray-400 font-black uppercase text-[8px] tracking-widest">
                    Created By
                  </Text>
                  <Text className="text-black font-black text-sm mt-0.5">
                    @{community.creator?.username}
                  </Text>
                </View>
              </View>
            </View>

            <View className="px-6 mb-8">
              <Text className="text-2xl font-black italic uppercase tracking-tighter">
                Community Feed
              </Text>
            </View>
          </>
        }
        onEndReached={() => hasNextPage && fetchNextPage()}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingFeed}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}
