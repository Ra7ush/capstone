import { useState } from "react";
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
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function MFAVerify() {
  const router = useRouter();
  const { verifyMFA, refresh } = useAuth();

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const onVerify = async () => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    try {
      const result = await verifyMFA(code);
      if (result.error) throw result.error;

      // refresh is called inside verifyMFA if successful
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Verification Failed", error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Verify Identity",
          headerShown: false,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-8 pt-24"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-[#FF4D00]/10 rounded-full items-center justify-center mb-6">
              <Ionicons name="shield-checkmark" size={40} color="#FF4D00" />
            </View>
            <Text className="text-3xl font-black italic text-center">
              Protocol<Text className="text-[#FF4D00]"> Verification</Text>
            </Text>
            <Text className="text-gray-400 font-bold text-center mt-4 px-4 leading-relaxed">
              Enter the 6-digit code from your authenticator app to authorize
              this session.
            </Text>
          </View>

          <View className="mb-12">
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor="#D1D5DB"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              className="bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 text-center text-4xl font-black italic tracking-[10px]"
            />
          </View>

          <Button
            title="Verify & Enter"
            onPress={onVerify}
            loading={isVerifying}
            disabled={code.length !== 6}
            variant="brand"
            className="py-5"
          />

          <TouchableOpacity
            onPress={handleLogout}
            className="mt-8 items-center"
          >
            <Text className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
              Cancel & Sign Out
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
