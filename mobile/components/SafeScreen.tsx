import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SafeScreenProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * SafeScreen Component
 *
 * A wrapper component that handles safe area insets for different devices.
 * Use this as the root container for screens to ensure content doesn't
 * overlap with notches, status bars, or home indicators.
 */
export default function SafeScreen({
  children,
  className = "",
}: SafeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-1 bg-white ${className}`}
      style={{ paddingTop: insets.top }}
    >
      {children}
    </View>
  );
}
