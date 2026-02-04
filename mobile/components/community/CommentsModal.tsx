import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePostComments } from "../../hooks/useCommunity";
import { formatTimeAgo } from "../../lib/utils";

// Helper to render comment content with blue @mentions
const renderCommentContent = (content: string) => {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <Text key={index} className="text-blue-500 font-semibold">
          {part}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
};

interface CommentsModalProps {
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
  currentUserImage?: string;
}

export const CommentsModal = ({
  visible,
  onClose,
  postId,
  addComment,
  isAddingComment,
  deleteComment,
  likeComment,
  unlikeComment,
  currentUserId,
  currentUserImage,
}: CommentsModalProps) => {
  const [newComment, setNewComment] = useState("");
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
                  <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center overflow-hidden">
                    {comment.user?.profile_image_url ? (
                      <Image
                        source={{ uri: comment.user.profile_image_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-gray-600 font-semibold text-sm">
                        {comment.user?.username?.charAt(0).toUpperCase() || "U"}
                      </Text>
                    )}
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
                        </Text>
                        {"\n"}
                        <Text className="text-black font-normal">
                          {renderCommentContent(comment.content)}
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
                        <Text className="text-purple-500 text-xs font-semibold">
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
          <View className="flex-row items-center px-4 py-3 border-t border-gray-200 pb-8">
            <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center overflow-hidden">
              {currentUserImage ? (
                <Image
                  source={{ uri: currentUserImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-gray-600 font-semibold text-sm">Me</Text>
              )}
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
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};
