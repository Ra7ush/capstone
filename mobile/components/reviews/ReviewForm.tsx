import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import StarRating from "./StarRating";
import type { Review } from "@/types";

interface ReviewFormProps {
  existingReview?: Review | null;
  onSubmit: (data: { rating: number; review_text?: string }) => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
  isDeleting?: boolean;
}

/**
 * Review form for creating or editing a review
 * Shows interactive star rating and optional text input
 */
export default function ReviewForm({
  existingReview,
  onSubmit,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(
    existingReview?.review_text || "",
  );

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review_text || "");
    }
  }, [existingReview]);

  const isEditing = !!existingReview;
  const canSubmit = rating > 0 && !isSubmitting && !isDeleting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      rating,
      review_text: reviewText.trim() || undefined,
    });
  };

  const getRatingLabel = (r: number): string => {
    switch (r) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Average";
      case 4:
        return "Good";
      case 5:
        return "Excellent";
      default:
        return "Tap to rate";
    }
  };

  return (
    <View className="bg-gray-50 rounded-2xl p-5">
      <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
        {isEditing ? "Update Your Review" : "Write a Review"}
      </Text>

      {/* Star Rating Input */}
      <View className="items-center mb-4">
        <StarRating rating={rating} size={36} interactive onRate={setRating} />
        <Text className="text-sm font-bold text-gray-500 mt-2">
          {getRatingLabel(rating)}
        </Text>
      </View>

      {/* Review Text Input */}
      <TextInput
        value={reviewText}
        onChangeText={setReviewText}
        placeholder="Share your experience with this course... (optional)"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={4}
        className="bg-white border border-gray-200 rounded-xl p-4 text-black text-sm min-h-[100px]"
        textAlignVertical="top"
        maxLength={1000}
      />
      <Text className="text-right text-gray-400 text-xs mt-1">
        {reviewText.length}/1000
      </Text>

      {/* Action Buttons */}
      <View className="flex-row mt-4 gap-3">
        {isEditing && onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            disabled={isDeleting || isSubmitting}
            className="flex-1 border border-red-200 py-3.5 rounded-xl items-center"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text className="text-red-500 font-bold text-sm">Delete</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`flex-1 py-3.5 rounded-xl items-center ${
            canSubmit ? "bg-black" : "bg-gray-300"
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-black text-sm">
              {isEditing ? "Update Review" : "Submit Review"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
