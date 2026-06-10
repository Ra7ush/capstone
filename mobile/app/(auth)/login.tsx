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
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as QueryParams from "expo-auth-session/build/QueryParams";

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
      // mobile:// scheme is registered in app.json and whitelisted in Supabase as mobile://**
      // openAuthSessionAsync internally intercepts this scheme via ASWebAuthenticationSession
      const redirectUrl = "mobile://auth/callback";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log("=== GOOGLE AUTH DEBUG ===");
        console.log("Result type:", result.type);

        if (result.type === "success") {
          console.log("Result URL:", result.url);

          const hashPart = result.url.split("#")[1];
          console.log("Hash part:", hashPart ? "found" : "missing");

          if (hashPart) {
            const { params, errorCode } = QueryParams.getQueryParams(
              "?" + hashPart
            );

            console.log("Parsed params keys:", Object.keys(params));
            console.log("Error code:", errorCode);

            if (errorCode) throw new Error(errorCode);

            const { access_token, refresh_token } = params;
            console.log("Access token:", access_token ? "present" : "missing");
            console.log("Refresh token:", refresh_token ? "present" : "missing");

            if (access_token && refresh_token) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

              if (sessionError) {
                console.log("Session error:", sessionError.message);
                throw sessionError;
              }

              console.log("Session set successfully! Navigating...");
              router.replace("/");
            } else {
              Alert.alert("Error", "Missing tokens in Google response.");
            }
          } else {
            Alert.alert("Error", "No authentication data received.");
          }
        } else if (result.type === "cancel" || result.type === "dismiss") {
          console.log("User cancelled/dismissed the auth flow");
        }
        console.log("=== END DEBUG ===");
      }
    } catch (error: any) {
      console.error("Google Auth Error:", error);
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

          {/* Forgot Password */}
          <View className="items-end mt-3">
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity>
                <Text className="text-[#FF4D00] font-black text-[11px] uppercase tracking-wider">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </Link>
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
