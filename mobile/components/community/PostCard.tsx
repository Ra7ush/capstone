import React, { memo, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Post } from "../../hooks/useCommunity";
import { formatTimeAgo } from "../../lib/utils";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLike: (post: Post) => void;
  onDelete: (id: string) => void;
  onFollow: (post: Post) => void;
  onOpenComments: (id: string) => void;
  onViewImages: (images: string[], index: number) => void;
  isLikeLoading?: boolean;
}

// Instagram-style animated heart button
const AnimatedHeart = memo(
  ({
    isLiked,
    onPress,
    disabled,
  }: {
    isLiked: boolean;
    onPress: () => void;
    disabled: boolean;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = useCallback(() => {
      if (disabled) return;

      // Trigger scale animation
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 0.7,
          useNativeDriver: true,
          speed: 50,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          useNativeDriver: true,
          speed: 50,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
        }),
      ]).start();

      onPress();
    }, [disabled, onPress, scaleAnim]);

    return (
      <Pressable onPress={handlePress} disabled={disabled}>
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={24}
            color={isLiked ? "#EF4444" : "#6B7280"}
          />
        </Animated.View>
      </Pressable>
    );
  },
);

AnimatedHeart.displayName = "AnimatedHeart";

export const PostCard = memo(
  ({
    post,
    currentUserId,
    onLike,
    onDelete,
    onFollow,
    onOpenComments,
    onViewImages,
    isLikeLoading = false,
  }: PostCardProps) => {
    // Track current image index for dot indicator
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // For double-tap to like on images (Instagram style)
    const lastTap = useRef<number>(0);
    const doubleTapAnim = useRef(new Animated.Value(0)).current;

    // Handle image scroll to update active dot
    const onImageScroll = useCallback((event: any) => {
      const slideSize = event.nativeEvent.layoutMeasurement.width;
      const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
      setCurrentImageIndex(index);
    }, []);

    // Handle tap on image - single tap opens viewer, double tap likes
    const handleImageTap = useCallback(
      (index: number) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
          // Double tap detected - like if not already liked
          if (
            !post.has_liked &&
            !isLikeLoading &&
            !post.id.startsWith("temp-")
          ) {
            onLike(post);

            // Show big heart animation overlay
            Animated.sequence([
              Animated.timing(doubleTapAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.delay(400),
              Animated.timing(doubleTapAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();
          }
          lastTap.current = 0; // Reset to prevent triple tap
        } else {
          // Single tap - open image viewer after delay to check for double tap
          lastTap.current = now;
          setTimeout(() => {
            if (lastTap.current === now) {
              // No second tap occurred, open viewer
              onViewImages(post.images!, index);
            }
          }, DOUBLE_TAP_DELAY);
        }
      },
      [post, isLikeLoading, onLike, doubleTapAnim, onViewImages],
    );

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
              <View className="flex-row items-center gap-1.5">
                <Text className="text-black font-black text-sm">
                  @{post.user?.username || "unknown"}
                </Text>
                {post.user?.verification_status === "verified" && (
                  <Ionicons name="checkmark-circle" size={14} color="#0095F6" />
                )}
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

        {/* Post Images - Tap to view, Double-tap to like, Swipe for more */}
        {post.images && post.images.length > 0 && (
          <View className="mb-4">
            {/* Image count badge */}
            {post.images.length > 1 && (
              <View className="absolute top-3 right-3 z-10 bg-black/60 px-2.5 py-1 rounded-full">
                <Text className="text-white text-xs font-semibold">
                  {currentImageIndex + 1}/{post.images.length}
                </Text>
              </View>
            )}

            <FlatList
              data={post.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onImageScroll}
              scrollEventThrottle={16}
              keyExtractor={(_: string, i: number) => i.toString()}
              renderItem={({
                item,
                index,
              }: {
                item: string;
                index: number;
              }) => (
                <Pressable
                  onPress={() => handleImageTap(index)}
                  style={{
                    width: SCREEN_WIDTH - 48,
                    height: 300,
                  }}
                >
                  <Image
                    source={{ uri: item }}
                    className="w-full h-full rounded-3xl"
                    resizeMode="cover"
                  />
                  {/* Double-tap heart overlay animation */}
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: doubleTapAnim,
                      transform: [
                        {
                          scale: doubleTapAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        },
                      ],
                    }}
                  >
                    <Ionicons name="heart" size={80} color="#fff" />
                  </Animated.View>
                </Pressable>
              )}
            />

            {/* Dot indicators for multiple images */}
            {post.images.length > 1 && (
              <View className="flex-row justify-center items-center gap-1.5 mt-3">
                {post.images.map((_: string, i: number) => (
                  <View
                    key={i}
                    className={`rounded-full transition-all ${
                      i === currentImageIndex
                        ? "w-2 h-2 bg-blue-500"
                        : "w-1.5 h-1.5 bg-gray-300"
                    }`}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Post Actions */}
        <View className="flex-row items-center gap-6">
          <View className="flex-row items-center gap-2">
            <AnimatedHeart
              isLiked={post.has_liked ?? false}
              onPress={() => onLike(post)}
              disabled={isLikeLoading || post.id.startsWith("temp-")}
            />
            <Text
              className={`${
                post.has_liked ? "text-red-500" : "text-gray-500"
              } font-bold text-sm`}
            >
              {post.likes_count || 0}
            </Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-2"
            onPress={() => onOpenComments(post.id)}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#6B7280" />
            <Text className="text-gray-500 font-bold text-sm">
              {post.comments_count || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="share-social-outline" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

PostCard.displayName = "PostCard";
