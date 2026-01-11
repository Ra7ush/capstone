import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  className?: string;
}

const variantStyles: Record<
  ButtonVariant,
  { container: string; text: string }
> = {
  primary: {
    container: "bg-black",
    text: "text-white",
  },
  secondary: {
    container: "bg-gray-100",
    text: "text-black",
  },
  outline: {
    container: "bg-transparent border border-gray-200",
    text: "text-black",
  },
  ghost: {
    container: "bg-transparent",
    text: "text-black",
  },
  danger: {
    container: "bg-red-500",
    text: "text-white",
  },
};

const sizeStyles: Record<
  ButtonSize,
  { container: string; text: string; icon: number }
> = {
  sm: {
    container: "h-10 px-4 rounded-xl",
    text: "text-sm",
    icon: 16,
  },
  md: {
    container: "h-14 px-6 rounded-2xl",
    text: "text-base",
    icon: 20,
  },
  lg: {
    container: "h-16 px-8 rounded-2xl",
    text: "text-lg",
    icon: 24,
  },
};

/**
 * Button Component
 *
 * A reusable button component with multiple variants and sizes.
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  className = "",
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  const iconColor =
    variant === "primary" || variant === "danger" ? "#FFFFFF" : "#000000";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      className={`
        flex-row items-center justify-center
        ${variantStyle.container}
        ${sizeStyle.container}
        ${isDisabled ? "opacity-50" : ""}
        ${className}
      `}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View className="flex-row items-center space-x-2">
          {icon && iconPosition === "left" && (
            <Ionicons name={icon} size={sizeStyle.icon} color={iconColor} />
          )}
          <Text className={`font-bold ${variantStyle.text} ${sizeStyle.text}`}>
            {title}
          </Text>
          {icon && iconPosition === "right" && (
            <Ionicons name={icon} size={sizeStyle.icon} color={iconColor} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default Button;
