import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StarRating from "./StarRating";
import type { Review } from "@/types";

interface ReviewItemProps {
  review: Review;
  currentUserId?: string;
}

/**
 * Individual review card showing user info, rating, and review text
 */
export default function ReviewItem({ review, currentUserId }: ReviewItemProps) {
  const isOwnReview = currentUserId === review.user_id;

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return `${diffMonths}mo ago`;
  };

  return (
    <View className="bg-gray-50 rounded-2xl p-4 mb-3">
      {/* User Info Row */}
      <View className="flex-row items-center mb-3">
        {review.user?.profile_image_url ? (
          <Image
            source={{ uri: review.user.profile_image_url }}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
            <Ionicons name="person" size={18} color="#9CA3AF" />
          </View>
        )}
        <View className="flex-1 ml-3">
          <View className="flex-row items-center">
            <Text className="font-bold text-black text-sm">
              {review.user?.username || "User"}
            </Text>
            {isOwnReview && (
              <View className="bg-black px-2 py-0.5 rounded-full ml-2">
                <Text className="text-white text-[10px] font-bold">You</Text>
              </View>
            )}
          </View>
          <Text className="text-gray-400 text-xs mt-0.5">
            {getRelativeTime(review.created_at)}
          </Text>
        </View>
      </View>

      {/* Rating */}
      <View className="mb-2">
        <StarRating rating={review.rating} size={14} />
      </View>

      {/* Review Text */}
      {review.review_text && (
        <Text className="text-gray-600 text-sm leading-5">
          {review.review_text}
        </Text>
      )}
    </View>
  );
}
