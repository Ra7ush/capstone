import { View, ActivityIndicator, Text } from "react-native";

interface LoaderProps {
  size?: "small" | "large";
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

/**
 * Loader Component
 *
 * A simple loading indicator component.
 */
export function Loader({
  size = "large",
  color = "#000000",
  text,
  fullScreen = false,
}: LoaderProps) {
  const content = (
    <View className="items-center justify-center">
      <ActivityIndicator size={size} color={color} />
      {text && <Text className="text-gray-400 mt-3 text-sm">{text}</Text>}
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        {content}
      </View>
    );
  }

  return content;
}

export default Loader;
