import React, { useState, useRef } from "react";
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

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");

  // OTP state — 6 digits
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleSendOtp = async () => {
    if (!email || !email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      // Just calling resetPasswordForEmail without redirectTo. 
      // Important: The Supabase Email template for 'Reset Password' MUST use {{ .Token }} instead of {{ .ConfirmationURL }} to send the 6 digit OTP.
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      setStep("otp");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, "");
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    // Go back on backspace if current field is empty
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      Alert.alert("Error", "Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "recovery",
      });

      if (error) throw error;

      // OTP verified — session is set, navigate to reset password screen
      router.replace("/(auth)/reset-password");
    } catch (error: any) {
      Alert.alert("Invalid Code", "The code you entered is incorrect or has expired. Please try again.");
      // Clear OTP fields on error
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert("Code Resent", "A new verification code has been sent to your email.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 px-8 justify-center space-y-8">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => {
            if (step === "otp") {
              setStep("email");
              setOtp(["", "", "", "", "", ""]);
            } else {
              router.back();
            }
          }}
          className="absolute top-16 left-8 z-10 bg-gray-50 w-10 h-10 rounded-full items-center justify-center"
        >
          <Ionicons name="chevron-back" size={20} color="black" />
        </TouchableOpacity>

        {/* Header */}
        <View className="items-center space-y-4 mb-8">
          <View className="bg-black w-16 h-16 rounded-2xl items-center justify-center shadow-lg">
            <Ionicons
              name={step === "email" ? "key-outline" : "shield-checkmark-outline"}
              size={28}
              color="white"
            />
          </View>
          <View className="items-center">
            <Text className="text-3xl font-black tracking-tighter text-black">
              {step === "email" ? (
                <>Reset<Text className="text-gray-300">Password</Text></>
              ) : (
                <>Verify<Text className="text-gray-300">Code</Text></>
              )}
            </Text>
            <Text className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4D00] mt-1">
              {step === "email" ? "Account Recovery" : "Enter OTP Code"}
            </Text>
          </View>
        </View>

        {step === "email" ? (
          /* ─── Step 1: Email Input ─── */
          <>
            <View className="mb-8">
              <Text className="text-gray-400 text-xs font-bold text-center leading-5 px-4">
                Enter the email address associated with your account. We'll
                send you a 6-digit verification code.
              </Text>
            </View>

            <View className="mb-8">
              <View className="space-y-1 mb-6">
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  Email Address
                </Text>
                <View className="w-full h-14 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-transparent">
                  <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 font-bold text-black"
                    placeholder="Enter your email"
                    placeholderTextColor="#D1D5DB"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoFocus
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={loading}
              className={`w-full h-16 bg-black rounded-2xl items-center justify-center shadow-xl mb-8 ${
                loading ? "opacity-80" : "opacity-100"
              }`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center space-x-2">
                  <Ionicons name="send-outline" size={20} color="white" />
                  <Text className="text-white text-sm font-black uppercase tracking-[0.2em]">
                    Send Code
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center items-center space-x-1">
              <Text className="text-gray-400 font-medium text-xs">
                Remember your password?
              </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-black font-black text-xs">Log In</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* ─── Step 2: OTP Verification ─── */
          <>
            <View className="mb-8">
              <Text className="text-gray-400 text-xs font-bold text-center leading-5 px-4">
                We've sent a 6-digit code to{" "}
                <Text className="text-black font-black">{email}</Text>.
                {"\n"}Enter it below to verify your identity.
              </Text>
            </View>

            {/* OTP Input Boxes */}
            <View className="flex-row justify-center space-x-3 mb-10">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  className={`w-12 h-14 text-center text-xl font-black rounded-2xl border-2 ${
                    digit
                      ? "bg-black text-white border-black"
                      : "bg-gray-50 text-black border-gray-200"
                  }`}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleOtpKeyPress(nativeEvent.key, index)
                  }
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={loading || otp.join("").length !== 6}
              className={`w-full h-16 bg-black rounded-2xl items-center justify-center shadow-xl mb-6 ${
                loading || otp.join("").length !== 6
                  ? "opacity-50"
                  : "opacity-100"
              }`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center space-x-2">
                  <Ionicons
                    name="checkmark-done-outline"
                    size={22}
                    color="white"
                  />
                  <Text className="text-white text-sm font-black uppercase tracking-[0.2em]">
                    Verify Code
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <View className="flex-row justify-center items-center space-x-1">
              <Text className="text-gray-400 font-medium text-xs">
                Didn't receive the code?
              </Text>
              <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                <Text className="text-[#FF4D00] font-black text-xs">
                  Resend
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
