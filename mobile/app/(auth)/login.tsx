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
import { Stack, useRouter, Link } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import { openAuthSessionAsync } from "expo-web-browser";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Login successful, router will likely be handled by auth state change or manual replace
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = makeRedirectUri({
        scheme: "mobile",
        path: "auth/callback",
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === "success" && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            router.replace("/");
          }
        }
      }
    } catch (error: any) {
      Alert.alert("Google Auth Failed", error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 px-8 justify-center space-y-8">
        {/* Header / Branding */}
        <View className="items-center space-y-4 mb-8">
          <View className="bg-black w-16 h-16 rounded-2xl items-center justify-center shadow-lg">
            <Text className="text-white text-3xl font-black italic">N</Text>
          </View>
          <View className="items-center">
            <Text className="text-3xl font-black tracking-tighter text-black">
              Welcome<Text className="text-gray-300">Back</Text>
            </Text>
            <Text className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4D00] mt-1">
              Access Your Dashboard
            </Text>
          </View>
        </View>

        {/* Google Auth Button */}
        <TouchableOpacity
          onPress={handleGoogleLogin}
          className="w-full h-14 bg-white border border-gray-200 rounded-2xl flex-row items-center justify-center space-x-3 mb-8 shadow-sm"
        >
          <Ionicons name="logo-google" size={20} color="black" />
          <Text className="text-black font-bold text-sm">
            Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View className="flex-row items-center mb-8">
          <View className="flex-1 h-[1px] bg-gray-100" />
          <Text className="mx-4 text-gray-300 text-xs font-bold uppercase tracking-widest">
            Or
          </Text>
          <View className="flex-1 h-[1px] bg-gray-100" />
        </View>

        {/* Form Group */}
        <View className="mb-8">
          {/* Email */}
          <View className="space-y-1 mb-6">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Email Address
            </Text>
            <View className="w-full h-14 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-transparent focus:border-black/5">
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 font-bold text-black"
                placeholder="Email"
                placeholderTextColor="#D1D5DB"
                autoCapitalize="none"
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
              />
            </View>
          </View>

          {/* Password */}
          <View className="space-y-1">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Password
            </Text>
            <View className="w-full h-14 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-transparent focus:border-black/5">
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 font-bold text-black"
                placeholder="Password"
                placeholderTextColor="#D1D5DB"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
              />
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className={`w-full h-16 bg-black rounded-2xl items-center justify-center shadow-xl active:scale-95 transition-all mb-8 ${
            loading ? "opacity-80" : "opacity-100"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center space-x-2">
              <Ionicons name="log-in-outline" size={24} color="white" />
              <Text className="text-white text-sm font-black uppercase tracking-[0.2em]">
                Log In
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Footer Link */}
        <View className="flex-row justify-center items-center space-x-1">
          <Text className="text-gray-400 font-medium text-xs">
            Don't have an account?
          </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text className="text-black font-black text-xs">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
