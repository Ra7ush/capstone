import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StarRating from "./StarRating";
import type { ReviewStats } from "@/types";

interface ReviewSummaryProps {
  stats: ReviewStats;
}

/**
 * Udemy-style review summary with average rating, star distribution bars
 */
export default function ReviewSummary({ stats }: ReviewSummaryProps) {
  const ratingLabels = [5, 4, 3, 2, 1];

  return (
    <View className="bg-gray-50 rounded-2xl p-5">
      <View className="flex-row items-center">
        {/* Left: Large average rating */}
        <View className="items-center mr-6">
          <Text className="text-5xl font-black text-black">
            {stats.average.toFixed(1)}
          </Text>
          <StarRating rating={stats.average} size={16} />
          <Text className="text-gray-400 text-xs font-bold mt-1">
            {stats.total} {stats.total === 1 ? "review" : "reviews"}
          </Text>
        </View>

        {/* Right: Rating distribution bars */}
        <View className="flex-1">
          {ratingLabels.map((star) => (
            <View key={star} className="flex-row items-center mb-1.5">
              <Text className="text-xs font-bold text-gray-500 w-4 text-right">
                {star}
              </Text>
              <Ionicons
                name="star"
                size={10}
                color="#F59E0B"
                style={{ marginHorizontal: 4 }}
              />
              <View className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${stats.percentages[star] || 0}%` }}
                />
              </View>
              <Text className="text-[10px] text-gray-400 font-bold w-8 text-right ml-2">
                {stats.percentages[star] || 0}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
