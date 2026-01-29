import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import * as Clipboard from "expo-clipboard";

export default function MFASetup() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    onEnroll();
  }, []);

  const onEnroll = async () => {
    setIsLoading(true);
    try {
      // 1. Clean up any pending (unverified) factors to prevent limits/collisions
      const { data: factors, error: listError } =
        await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      const unverifiedFactors = factors.totp.filter(
        (f: any) => f.status === "unverified",
      );
      if (unverifiedFactors.length > 0) {
        for (const factor of unverifiedFactors) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      // 2. Enroll new factor with unique name
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Nexus-${Date.now()}`,
      });
      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp.uri);
      setSecret(data.totp.secret);
    } catch (error: any) {
      Alert.alert("Enrollment Error", error.message);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/advanced-settings");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onVerify = async () => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: factorId!,
        });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId!,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) throw verifyError;

      Alert.alert("Success", "Two-factor authentication is now active.", [
        {
          text: "OK",
          onPress: () => {
            refresh();
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Verification Failed", error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="black" />
        <Text className="mt-4 font-bold text-gray-400">
          Initializing Protocol...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Setup 2FA",
          headerShown: true,
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-8 pt-8"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-3xl font-black italic mb-2">
            Secure your<Text className="text-[#FF4D00]"> Identity</Text>
          </Text>
          <Text className="text-gray-400 font-bold leading-relaxed mb-8">
            Scan the QR code with your authenticator app (Google Authenticator,
            Authy, etc.) to link your account.
          </Text>

          <View className="items-center mb-8 bg-gray-50 p-8 rounded-[3rem] border border-gray-100">
            {qrCode && (
              <QRCode
                value={qrCode}
                size={200}
                backgroundColor="transparent"
                color="black"
              />
            )}
            <TouchableOpacity
              onPress={() => qrCode && Linking.openURL(qrCode)}
              className="mt-6 bg-black px-6 py-3 rounded-full flex-row items-center"
            >
              <Text className="text-white font-bold text-xs mr-2">
                Open Authenticator
              </Text>
              <Ionicons name="open-outline" size={14} color="white" />
            </TouchableOpacity>
          </View>

          <View className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 mb-8">
            <Text className="text-gray-500 text-[10px] font-black uppercase mb-2 ml-2">
              Manual Setup Secret
            </Text>
            <TouchableOpacity
              onPress={async () => {
                if (secret) {
                  await Clipboard.setStringAsync(secret);
                  Alert.alert("Copied", "Secret copied to clipboard");
                }
              }}
              className="bg-white p-4 rounded-2xl border border-gray-100 flex-row justify-between items-center"
            >
              <Text
                className="font-mono font-bold text-black flex-1"
                numberOfLines={1}
              >
                {secret}
              </Text>
              <Ionicons name="copy-outline" size={18} color="#FF4D00" />
            </TouchableOpacity>
          </View>

          <View className="mb-12">
            <Text className="text-gray-500 text-[10px] font-black uppercase mb-4 ml-2">
              Verification Code
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor="#D1D5DB"
              keyboardType="number-pad"
              maxLength={6}
              className="bg-white border-2 border-gray-50 rounded-[2rem] p-6 text-center text-4xl font-black italic tracking-[10px]"
            />
          </View>

          <Button
            title="Activate 2FA"
            onPress={onVerify}
            loading={isVerifying}
            disabled={code.length !== 6}
            variant="brand"
            className="py-5"
          />

          <Text className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed mt-6 mb-12">
            Ensure you have saved your recovery codes.{"\n"}Protocol activation
            is permanent.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
