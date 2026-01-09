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
  StyleSheet,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;

  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      Alert.alert("Error", "Please enter a valid 6-digit code");
      return;
    }

    // Log for debugging
    console.log("Verifying OTP:", { email, code: code.trim(), type: "email" });

    setLoading(true);
    try {
      // Try with type "email" first (newer Supabase OTP flow)
      let { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code.trim(),
        type: "email",
      });

      // If "email" type fails, try "signup" type
      if (error) {
        console.log("Type 'email' failed, trying 'signup':", error.message);
        const result = await supabase.auth.verifyOtp({
          email: email,
          token: code.trim(),
          type: "signup",
        });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      console.log("Verification success:", data);

      // Just show success - the AuthGuard will detect the verified state
      // and redirect to onboarding automatically
      Alert.alert("Success", "Email verified successfully!", [
        { text: "Continue" },
      ]);
    } catch (error: any) {
      console.error("Verification error:", error);
      Alert.alert("Verification Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Render a single OTP box
  const renderBox = (index: number) => {
    const digit = code[index];
    const isFocused = code.length === index;
    const isFilled = !!digit;

    return (
      <View
        key={index}
        style={[
          styles.box,
          (isFocused || isFilled) && styles.boxActive,
          isFocused && styles.boxFocused,
        ]}
      >
        <Text style={[styles.digit, isFilled && styles.digitFilled]}>
          {digit || "•"}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 px-8 justify-center">
        {/* Header */}
        <View className="mb-12">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mb-8"
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>

          <Text className="text-3xl font-black text-black tracking-tighter mb-2">
            Verify Email
          </Text>
          <Text className="text-gray-400 font-medium text-base">
            Please enter the verification code sent to{" "}
            <Text className="text-black font-bold">{email}</Text>
          </Text>
        </View>

        {/* OTP Input */}
        <View className="mb-10">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Verification Code
          </Text>

          <View style={styles.boxContainer}>
            {/* Hidden input for keyboard */}
            <TextInput
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              autoFocus
              caretHidden
            />

            {/* Visual boxes */}
            {[0, 1, 2, 3, 4, 5].map(renderBox)}
          </View>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          onPress={handleVerify}
          disabled={loading}
          className="w-full h-16 bg-black rounded-2xl items-center justify-center"
          style={{ opacity: loading ? 0.8 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-sm font-black uppercase tracking-widest">
              Verify Account
            </Text>
          )}
        </TouchableOpacity>

        {/* Resend Link */}
        <TouchableOpacity className="mt-8 items-center">
          <Text className="text-gray-400 font-medium text-xs">
            Didn't receive code?{" "}
            <Text className="text-black font-bold">Resend</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  boxContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    position: "relative",
  },
  hiddenInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
    zIndex: 10,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: {
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
  },
  boxFocused: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  digit: {
    fontSize: 20,
    fontWeight: "900",
    color: "#D1D5DB",
  },
  digitFilled: {
    color: "#000000",
  },
});
