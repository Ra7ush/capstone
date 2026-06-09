import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";

export default function ResetPassword() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      console.log("Updating password...");

      // We can now safely await this since AuthContext won't deadlock on USER_UPDATED
      const result = await Promise.race([
        supabase.auth.updateUser({ password: newPassword }),
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(
            () => resolve({ data: null, error: new Error("Network request timed out. Please check your internet connection.") }),
            10000
          )
        ),
      ]);

      console.log("Update response:", result);

      setLoading(false);

      if (result.error) {
        Alert.alert("Error", result.error.message);
        return;
      }

      // Password updated successfully.
      // Sign out and send to login so user confirms their new password works.
      await supabase.auth.signOut().catch(() => {});

      Alert.alert(
        "Password Updated",
        "Your password has been successfully changed. Please log in with your new password.",
        [
          {
            text: "Log In",
            onPress: () => router.replace("/(auth)/login"),
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error("Password update error:", error);
      setLoading(false);
      Alert.alert("Error", error.message || "Something went wrong.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 px-8 justify-center space-y-8">
        {/* Header */}
        <View className="items-center space-y-4 mb-8">
          <View className="bg-black w-16 h-16 rounded-2xl items-center justify-center shadow-lg">
            <Ionicons name="shield-checkmark-outline" size={28} color="white" />
          </View>
          <View className="items-center">
            <Text className="text-3xl font-black tracking-tighter text-black">
              New<Text className="text-gray-300">Password</Text>
            </Text>
            <Text className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4D00] mt-1">
              Secure Your Account
            </Text>
          </View>
        </View>

        {/* Description */}
        <View className="mb-8">
          <Text className="text-gray-400 text-xs font-bold text-center leading-5 px-4">
            Create a strong new password for your account. Make sure it's at
            least 6 characters long.
          </Text>
        </View>

        {/* Password Fields */}
        <View className="mb-8">
          {/* New Password */}
          <View className="space-y-1 mb-6">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              New Password
            </Text>
            <View className="w-full h-14 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-transparent">
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 font-bold text-black"
                placeholder="Min. 6 characters"
                placeholderTextColor="#D1D5DB"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                autoFocus
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View className="space-y-1">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Confirm Password
            </Text>
            <View className="w-full h-14 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-transparent">
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#9CA3AF"
              />
              <TextInput
                className="flex-1 ml-3 font-bold text-black"
                placeholder="Re-enter your password"
                placeholderTextColor="#D1D5DB"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={
                    showConfirmPassword ? "eye-outline" : "eye-off-outline"
                  }
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password match indicator */}
          {confirmPassword.length > 0 && (
            <View className="flex-row items-center mt-3 px-1">
              <Ionicons
                name={
                  newPassword === confirmPassword
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={14}
                color={newPassword === confirmPassword ? "#22C55E" : "#EF4444"}
              />
              <Text
                className={`text-[10px] font-bold ml-1 ${
                  newPassword === confirmPassword
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {newPassword === confirmPassword
                  ? "Passwords match"
                  : "Passwords do not match"}
              </Text>
            </View>
          )}
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          onPress={handleResetPassword}
          disabled={loading || !newPassword || !confirmPassword}
          className={`w-full h-16 bg-black rounded-2xl items-center justify-center shadow-xl active:scale-95 transition-all mb-8 ${
            loading || !newPassword || !confirmPassword
              ? "opacity-50"
              : "opacity-100"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center space-x-2">
              <Ionicons name="checkmark-done-outline" size={22} color="white" />
              <Text className="text-white text-sm font-black uppercase tracking-[0.2em]">
                Confirm Password
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Security note */}
        <View className="flex-row justify-center items-center space-x-1">
          <Ionicons name="lock-closed" size={12} color="#D1D5DB" />
          <Text className="text-gray-300 text-[10px] font-black uppercase tracking-widest">
            End-to-End Encrypted
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
