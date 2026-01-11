import {
  View,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef } from "react";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerClassName?: string;
}

/**
 * Input Component
 *
 * A reusable text input component with label, icon, and error support.
 */
export const Input = forwardRef<RNTextInput, InputProps>(
  (
    {
      label,
      error,
      icon,
      rightIcon,
      onRightIconPress,
      containerClassName = "",
      ...props
    },
    ref
  ) => {
    return (
      <View className={`${containerClassName}`}>
        {label && (
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-1">
            {label}
          </Text>
        )}
        <View
          className={`
            w-full h-14 bg-gray-50 rounded-2xl flex-row items-center px-4
            border ${error ? "border-red-500" : "border-transparent"}
          `}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={error ? "#EF4444" : "#9CA3AF"}
            />
          )}
          <RNTextInput
            ref={ref}
            className={`flex-1 ${icon ? "ml-3" : ""} font-bold text-black`}
            placeholderTextColor="#D1D5DB"
            {...props}
          />
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
            >
              <Ionicons name={rightIcon} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <Text className="text-red-500 text-xs mt-1 px-1">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";

export default Input;
