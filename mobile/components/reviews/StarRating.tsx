import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StarRatingProps {
  rating: number;
  size?: number;
  color?: string;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

/**
 * Star rating display/input component
 * Shows filled/half/empty stars based on rating value
 * When interactive=true, allows tapping stars to set rating
 */
export default function StarRating({
  rating,
  size = 16,
  color = "#F59E0B",
  interactive = false,
  onRate,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  const getStarIcon = (
    starNumber: number,
  ): "star" | "star-half" | "star-outline" => {
    if (rating >= starNumber) return "star";
    if (rating >= starNumber - 0.5) return "star-half";
    return "star-outline";
  };

  if (interactive) {
    return (
      <View className="flex-row items-center gap-1">
        {stars.map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRate?.(star)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons
              name={rating >= star ? "star" : "star-outline"}
              size={size}
              color={color}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-0.5">
      {stars.map((star) => (
        <Ionicons
          key={star}
          name={getStarIcon(star)}
          size={size}
          color={color}
        />
      ))}
    </View>
  );
}
