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
  Animated,
  Dimensions,
  FlatList,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import * as ImagePicker from "expo-image-picker";
import { useCommunity, usePostComments, Post } from "../../hooks/useCommunity";
import { useFollow } from "../../hooks/useFollow";
import { ImageViewer } from "../../components";
import { useAuthState } from "../../hooks/useAuthState";
import { useUser, useCreatorProfile } from "@/hooks/useUser";
import { formatTimeAgo } from "../../lib/utils";

// Memoized Post Card for performance
const PostCard = memo(
  ({
    post,
    currentUserId,
    onLike,
    onDelete,
    onFollow,
    onOpenComments,
    onViewImages,
  }: {
    post: Post;
    currentUserId?: string;
    onLike: (post: Post) => void;
    onDelete: (id: string) => void;
    onFollow: (post: Post) => void;
    onOpenComments: (id: string) => void;
    onViewImages: (images: string[], index: number) => void;
  }) => {
    return (
      <View className="mb-8 border-b border-gray-50 pb-8">
        {/* Post Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center">
              <Text className="text-white font-bold">
                {post.user?.username?.charAt(0).toUpperCase() || "U"}
              </Text>
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
                {post.user?.bio ? ` • ${post.user.bio}` : ""}
              </Text>
            </View>
          </View>
          {post.user_id === currentUserId && (
            <TouchableOpacity onPress={() => onDelete(post.id)}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Post Content */}
        <Text className="text-gray-800 font-medium leading-6 mb-4">
          {post.content}
        </Text>

        {/* Post Images - Horizontal Scroll */}
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
            {post.images.length > 1 && (
              <View className="flex-row justify-center gap-1 mt-2">
                {post.images.map((_: string, i: number) => (
                  <View
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gray-300"
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Post Actions */}
        <View className="flex-row items-center gap-8">
          <TouchableOpacity
            className="flex-row items-center gap-2"
            onPress={() => onLike(post)}
          >
            <Ionicons
              name={post.has_liked ? "heart" : "heart-outline"}
              size={22}
              color={post.has_liked ? "#EF4444" : "#6B7280"}
            />
            <Text
              className={`${
                post.has_liked ? "text-red-500" : "text-gray-500"
              } font-bold text-xs`}
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
          <TouchableOpacity>
            <Ionicons name="share-social-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

// Comments Modal Component
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
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const inputRef = useRef<TextInput>(null);

  const { data: comments, isLoading, refetch } = usePostComments(postId);

  const screenHeight = Dimensions.get("window").height;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const quickEmojis = ["❤️", "🔥", "👏", "😍", "😮", "😢", "😂"];
  const sampleGifs = [
    "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
    "https://media.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif",
    "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
    "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
    "https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif",
  ];

  const handleEmojiPress = (emoji: string) => {
    setNewComment((prev) => prev + emoji);
  };

  const handleGifSelect = async (gifUrl: string) => {
    setShowGifPicker(false);
    try {
      await addComment({ postId, content: gifUrl });
      refetch();
    } catch {
      Alert.alert("Error", "Failed to send GIF");
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    const content = newComment;
    const parentId = replyingTo?.id;
    setNewComment("");
    setReplyingTo(null);

    try {
      await addComment({ postId, content, parentId });
      refetch();
    } catch (error) {
      setNewComment(content);
      if (parentId) setReplyingTo({ id: parentId });
      Alert.alert("Error", "Could not post comment. Please try again.");
    }
  };

  const handleReplyPress = (comment: any) => {
    setReplyingTo(comment);
    setNewComment(`@${comment.user?.username} `);
    inputRef.current?.focus();
  };

  const handleLikeComment = async (comment: any) => {
    try {
      if (comment.has_liked) {
        await unlikeComment({ commentId: comment.id, postId });
      } else {
        await likeComment({ commentId: comment.id, postId });
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleDelete = async (commentId: string) => {
    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteComment({ postId, commentId });
            refetch();
          } catch (error) {
            Alert.alert("Error", "Failed to delete comment");
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Animated.View
        style={{ opacity: fadeAnim }}
        className="absolute top-0 bottom-0 left-0 right-0 bg-black/60"
      >
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>
      <Animated.View
        style={{
          height: "100%",
          justifyContent: "flex-end",
          transform: [{ translateY: slideAnim }],
        }}
        pointerEvents="box-none"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="bg-white rounded-t-[20px]"
          style={{ height: "70%" }}
        >
          <View className="items-center pt-3">
            <View className="w-9 h-1 bg-gray-300 rounded-full" />
          </View>
          <View className="flex-row items-center justify-center py-3 border-b border-gray-200 relative">
            <Text className="font-semibold text-[16px]">Comments</Text>
            <TouchableOpacity className="absolute right-4">
              <Ionicons name="paper-plane-outline" size={24} color="black" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#000" className="mt-8" />
            ) : comments && comments.length > 0 ? (
              comments.map((comment) => (
                <View key={comment.id} className="flex-row py-3">
                  <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
                    <Text className="text-gray-600 font-semibold text-sm">
                      {comment.user?.username?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                  <View className="flex-1 ml-3">
                    <View>
                      <Text className="text-[13px] leading-[18px]">
                        <Text className="font-semibold">
                          {comment.user?.username || "unknown"}
                        </Text>
                        {"  "}
                        <Text className="text-gray-400 font-normal">
                          {formatTimeAgo(comment.created_at)}
                          {comment.user?.bio ? ` • ${comment.user.bio}` : ""}
                        </Text>
                        {"\n"}
                        <Text className="text-black font-normal">
                          {comment.content.split(" ").map((word, i) => (
                            <Text
                              key={i}
                              className={
                                word.startsWith("@")
                                  ? "text-[#0095F6]"
                                  : "text-black"
                              }
                            >
                              {word}{" "}
                            </Text>
                          ))}
                        </Text>
                      </Text>
                    </View>
                    <View className="flex-row items-center mt-2 gap-3">
                      <Text className="text-gray-400 text-xs font-medium">
                        {comment.likes_count || 0}{" "}
                        {comment.likes_count === 1 ? "like" : "likes"}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleReplyPress(comment)}
                      >
                        <Text className="text-gray-400 text-xs font-semibold">
                          Reply
                        </Text>
                      </TouchableOpacity>
                      {comment.user_id === currentUserId && (
                        <TouchableOpacity
                          onPress={() => handleDelete(comment.id)}
                        >
                          <Text className="text-gray-400 text-xs font-semibold">
                            Delete
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    className="pt-2 pl-2"
                    onPress={() => handleLikeComment(comment)}
                  >
                    <Ionicons
                      name={comment.has_liked ? "heart" : "heart-outline"}
                      size={14}
                      color={comment.has_liked ? "#EF4444" : "#262626"}
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View className="items-center py-12">
                <Text className="text-[22px] font-semibold mb-1">
                  No comments yet
                </Text>
                <Text className="text-gray-400 text-sm">
                  Start the conversation.
                </Text>
              </View>
            )}
          </ScrollView>
          <View className="flex-row justify-around px-4 py-2 border-t border-gray-100">
            {quickEmojis.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleEmojiPress(emoji)}
                activeOpacity={0.7}
              >
                <Text className="text-2xl">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Modal
            visible={showGifPicker}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowGifPicker(false)}
          >
            <TouchableOpacity
              className="flex-1 bg-black/60"
              activeOpacity={1}
              onPress={() => setShowGifPicker(false)}
            />
            <View className="bg-white rounded-t-[20px] h-[50%]">
              <View className="items-center pt-3">
                <View className="w-9 h-1 bg-gray-300 rounded-full" />
              </View>
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
                <Text className="font-semibold text-[16px]">Choose a GIF</Text>
                <TouchableOpacity onPress={() => setShowGifPicker(false)}>
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
              </View>
              <ScrollView className="flex-1 p-2">
                <View className="flex-row flex-wrap">
                  {sampleGifs.map((gif, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleGifSelect(gif)}
                      className="w-[48%] m-[1%] h-32 rounded-lg overflow-hidden"
                    >
                      <Image
                        source={{ uri: gif }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Modal>
          <View className="flex-row items-center px-4 py-3 border-t border-gray-200 pb-8">
            <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
              <Text className="text-gray-600 font-semibold text-sm">Me</Text>
            </View>
            <View className="flex-1 flex-row items-center mx-3 bg-gray-100 rounded-full px-4 py-2">
              <TextInput
                ref={inputRef}
                placeholder={
                  replyingTo
                    ? `Replying to ${replyingTo.user?.username}...`
                    : "Add a comment..."
                }
                placeholderTextColor="#8E8E8E"
                className="flex-1 text-[14px]"
                value={newComment}
                onChangeText={setNewComment}
              />
              {isAddingComment ? (
                <ActivityIndicator size="small" color="#0095F6" />
              ) : newComment.trim() ? (
                <TouchableOpacity onPress={handleSubmit}>
                  <Text className="text-[#0095F6] font-semibold text-[14px]">
                    Post
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setShowGifPicker(true)}>
                  <Text className="text-[#0095F6] font-semibold text-[14px]">
                    GIF
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

export default function Community() {
  const [activeTab, setActiveTab] = useState("For You");
  const [postContent, setPostContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [commentsPost, setCommentsPost] = useState<string | null>(null);

  const { session, user: authUser } = useAuthState();
  const { data: dbUser } = useUser();
  const { data: creatorProfile } = useCreatorProfile(session?.user?.id);

  const user = {
    ...authUser,
    profile: dbUser
      ? { ...dbUser, bio: creatorProfile?.bio }
      : authUser?.profile,
  };
  const currentUserId = session?.user?.id;
  const router = useRouter();

  const {
    feed,
    isLoadingFeed,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetchFeed,
    createPost,
    isCreatingPost,
    likePost,
    unlikePost,
    uploadImage,
    deletePost,
    addComment,
    isAddingComment,
    deleteComment,
    likeComment,
    unlikeComment,
  } = useCommunity();

  const { follow, unfollow } = useFollow();

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - selectedImages.length,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset) => asset.uri);
        setSelectedImages((prev) => [...prev, ...newImages].slice(0, 5));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick images");
    }
  };

  const handlePost = async () => {
    if (!postContent.trim() && selectedImages.length === 0) {
      Alert.alert("Required", "Please add some content or an image.");
      return;
    }
    try {
      const imageUrls = await Promise.all(
        selectedImages.map((uri) => uploadImage(uri))
      );
      await createPost({
        content: postContent,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });
      setPostContent("");
      setSelectedImages([]);
    } catch (error) {
      Alert.alert("Error", "Failed to create post. Please try again.");
    }
  };

  const handleLike = useCallback(
    async (post: any) => {
      try {
        if (post.has_liked) {
          await unlikePost(post.id);
        } else {
          await likePost(post.id);
        }
      } catch (error) {
        console.error("Like error:", error);
      }
    },
    [likePost, unlikePost]
  );

  const handleDeletePost = useCallback(
    (postId: string) => {
      Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePost(postId);
            } catch (error) {
              Alert.alert("Error", "Failed to delete post");
            }
          },
        },
      ]);
    },
    [deletePost]
  );

  const handleFollowAction = useCallback(
    async (post: any) => {
      try {
        if (post.is_following) {
          await unfollow(post.user_id);
        } else {
          await follow(post.user_id);
        }
        refetchFeed();
      } catch (error) {
        console.error("Follow error:", error);
      }
    },
    [follow, unfollow, refetchFeed]
  );

  const handleOpenComments = useCallback((id: string) => {
    setCommentsPost(id);
  }, []);

  const handleViewImages = useCallback((images: string[], index: number) => {
    setViewingImages(images);
    setViewingIndex(index);
  }, []);

  const renderListHeader = () => (
    <>
      {/* Header */}
      <View className="px-6 pt-16 pb-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-2xl font-black text-black">Community</Text>
        <View className="flex-row gap-4">
          <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
            <Ionicons name="search" size={20} color="black" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
            <Ionicons name="notifications-outline" size={20} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Post Section */}
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
              className="text-black font-medium leading-5 mb-4 max-h-32"
              value={postContent}
              onChangeText={setPostContent}
            />

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
                      className="w-40 h-40 rounded-xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"
                      onPress={() =>
                        setSelectedImages((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View className="flex-row items-center justify-between">
              <View className="flex-row gap-4">
                <TouchableOpacity onPress={pickImage}>
                  <Ionicons name="image-outline" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                className={`bg-black px-6 py-2 rounded-full ${isCreatingPost ? "opacity-50" : ""}`}
                onPress={handlePost}
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

      {/* Tabs */}
      <View className="flex-row border-b border-gray-100 mb-8">
        {["For You", "Profile"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
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
  );

  const renderProfileTab = () => (
    <View className="px-6 pb-12">
      {user?.profile ? (
        <View
          className="bg-white p-8 rounded-[3rem] border border-gray-100 items-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="mb-6">
            <View className="w-28 h-28 rounded-full p-1.5 border-2 border-[#FF4D00] items-center justify-center">
              <View className="w-full h-full rounded-full bg-gray-50 items-center justify-center overflow-hidden">
                {user.profile.avatar_url ? (
                  <Image
                    source={{ uri: user.profile.avatar_url }}
                    className="w-full h-full"
                  />
                ) : (
                  <Text className="text-[#FF4D00] font-black text-4xl italic">
                    {user.profile.username?.charAt(0).toUpperCase() || "C"}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <Text className="text-black font-black text-3xl tracking-tighter mb-8">
            {user.profile.full_name || user.profile.username}
          </Text>
          <View className="flex-row items-center justify-center gap-16 mb-8">
            <View className="items-center">
              <Text className="text-black font-black text-2xl italic leading-none">
                {user.profile.followers_count || 0}
              </Text>
              <Text className="text-gray-400 text-[10px] font-black uppercase mt-2 tracking-widest">
                Followers
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-black font-black text-2xl italic leading-none">
                {user.profile.following_count || 0}
              </Text>
              <Text className="text-gray-400 text-[10px] font-black uppercase mt-2 tracking-widest">
                Following
              </Text>
            </View>
          </View>
          {user.profile.bio && (
            <Text className="text-gray-400 font-bold text-center mb-8 px-4 leading-5">
              {user.profile.bio}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => router.push("/profile-edit")}
            className="w-full bg-black py-5 rounded-[2rem] items-center"
          >
            <Text className="text-white font-black uppercase tracking-widest text-xs">
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="mb-8 bg-white p-8 rounded-[3rem] border border-gray-100 items-center opacity-50">
          <ActivityIndicator size="small" color="#000" />
          <Text className="text-gray-400 font-bold mt-4">
            Loading profile...
          </Text>
        </View>
      )}
    </View>
  );

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
        className="flex-1"
        data={activeTab === "For You" ? feed : []}
        keyExtractor={(item) => item.id}
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
            />
          </View>
        )}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={() => (
          <>
            {activeTab === "Profile" && renderProfileTab()}
            {activeTab === "For You" && isFetchingNextPage && (
              <ActivityIndicator size="large" color="#000" className="my-8" />
            )}
          </>
        )}
        onEndReached={() => {
          if (activeTab === "For You" && hasNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingFeed && !isFetchingNextPage}
            onRefresh={refetchFeed}
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}
