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
import { mmkvStorage } from "@/lib/storage";
import { STORAGE_KEYS } from "@/constants";

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const handleSignup = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        Alert.alert("Success", "Account created successfully!", [
          { text: "Continue", onPress: () => router.replace("/") },
        ]);
      } else if (data.user) {
        // Save pending email for app restart recovery
        mmkvStorage.setItem(STORAGE_KEYS.PENDING_EMAIL, formData.email);

        // Navigate to OTP verification
        router.push({
          pathname: "/(auth)/verify",
          params: { email: formData.email },
        });
      }
    } catch (error: any) {
      Alert.alert("Signup Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
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

        console.log("Google Signup Result:", result.type);

        if (result.type === "success") {
          const hashPart = result.url.split("#")[1];

          if (hashPart) {
            const { params, errorCode } = QueryParams.getQueryParams(
              "?" + hashPart
            );

            if (errorCode) throw new Error(errorCode);

            const { access_token, refresh_token } = params;

            if (access_token && refresh_token) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

              if (sessionError) throw sessionError;
              router.replace("/");
            } else {
              Alert.alert("Error", "Missing tokens in Google response.");
            }
          } else {
            Alert.alert("Error", "No authentication data received.");
          }
        }
      }
    } catch (error: any) {
      console.error("Google Signup Error:", error);
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
              Nexus<Text className="text-gray-300">Hub</Text>
            </Text>
            <Text className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4D00] mt-1">
              Creator Workflow
            </Text>
          </View>
        </View>

        {/* Google Auth Button */}
        <TouchableOpacity
          onPress={handleGoogleSignup}
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
          {/* Full Name */}
          <View className="space-y-1 mb-6">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Full Name
            </Text>
            <View className="w-full h-14 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-transparent focus:border-black/5">
              <Ionicons name="person-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 font-bold text-black"
                placeholder="Full Name"
                placeholderTextColor="#D1D5DB"
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullName: text })
                }
              />
            </View>
          </View>

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
          onPress={handleSignup}
          disabled={loading}
          className={`w-full h-16 bg-black rounded-2xl items-center justify-center shadow-xl active:scale-95 transition-all mb-8 ${
            loading ? "opacity-80" : "opacity-100"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center space-x-2">
              <Ionicons name="arrow-forward" size={20} color="white" />
              <Text className="text-white text-sm font-black uppercase tracking-[0.2em]">
                Create Account
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Footer Link */}
        <View className="flex-row justify-center items-center space-x-1">
          <Text className="text-gray-400 font-medium text-xs">
            Already have an account?
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-black font-black text-xs">Log In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
