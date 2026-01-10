import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

export default function VerificationApply() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullLegalName, setFullLegalName] = useState("");
  const [idType, setIdType] = useState("national_id");
  const [images, setImages] = useState<{
    front: string | null;
    back: string | null;
    selfie: string | null;
  }>({
    front: null,
    back: null,
    selfie: null,
  });
  const [loading, setLoading] = useState(false);

  const pickImage = async (type: "front" | "back" | "selfie") => {
    // Request permissions
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (
      cameraPermission.status !== "granted" ||
      libraryPermission.status !== "granted"
    ) {
      Alert.alert(
        "Permission Required",
        "We need camera and gallery permissions to verify your identity."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages((prev) => ({ ...prev, [type]: result.assets[0].uri }));
    }
  };

  const uploadImage = async (uri: string, path: string) => {
    const formData = new FormData();
    const fileName = uri.split("/").pop();
    const fileType = fileName?.split(".").pop();

    formData.append("file", {
      uri,
      name: fileName,
      type: `image/${fileType}`,
    } as any);

    const { data, error } = await supabase.storage
      .from("verifications")
      .upload(path, formData, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;
    return supabase.storage.from("verifications").getPublicUrl(data.path).data
      .publicUrl;
  };

  const handleSubmit = async () => {
    if (!images.front || !images.selfie) {
      Alert.alert("Error", "Please provide all required photos.");
      return;
    }

    try {
      setLoading(true);
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      // 1. Upload to Supabase Storage
      const frontUrl = await uploadImage(
        images.front,
        `${user.id}/id_front_${Date.now()}.jpg`
      );
      let backUrl = null;
      if (images.back) {
        backUrl = await uploadImage(
          images.back,
          `${user.id}/id_back_${Date.now()}.jpg`
        );
      }
      const selfieUrl = await uploadImage(
        images.selfie,
        `${user.id}/selfie_${Date.now()}.jpg`
      );

      // 2. Submit to Backend
      // Note: We use the backend URL here. Usually this would be in an env var.
      // For this task, I'll assume standard Axios or fetch to the backend.
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/creator/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            full_legal_name: fullLegalName || user.user_metadata?.full_name,
            id_type: idType,
            id_front_url: frontUrl,
            id_back_url: backUrl,
            selfie_url: selfieUrl,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Submission failed");

      Alert.alert(
        "Success",
        "Verification submitted! Admins will review it soon.",
        [{ text: "OK", onPress: () => router.replace("/(home)") }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-black p-6">
      <View className="mt-12 space-y-6 pb-20">
        <View className="space-y-2">
          <Text className="text-3xl font-black text-white">
            Identity Verification
          </Text>
          <Text className="text-gray-400">
            Required for creators in Kurdistan.
          </Text>
        </View>

        {step === 1 && (
          <View className="space-y-6">
            <View className="bg-white/5 p-5 rounded-3xl border border-white/10 space-y-4">
              <View>
                <Text className="text-white font-bold mb-2">Legal Name</Text>
                <View className="h-14 bg-white/10 rounded-2xl px-4 border border-white/10 justify-center">
                  <TextInput
                    className="text-white font-bold text-base"
                    placeholder="As shown on your ID"
                    placeholderTextColor="#6B7280"
                    value={fullLegalName}
                    onChangeText={setFullLegalName}
                  />
                </View>
              </View>

              <View>
                <Text className="text-white font-bold mb-2">
                  ID Document Type
                </Text>
                <View className="flex-row gap-2">
                  {[
                    { id: "national_id", label: "National ID" },
                    { id: "passport", label: "Passport" },
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => setIdType(type.id)}
                      className={`flex-1 h-12 rounded-xl items-center justify-center border ${
                        idType === type.id
                          ? "bg-[#FF4D00] border-[#FF4D00]"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <Text
                        className={`font-bold text-xs ${
                          idType === type.id ? "text-white" : "text-gray-400"
                        }`}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View className="bg-white/5 p-4 rounded-3xl border border-white/10">
              <Text className="text-white font-bold mb-4">
                Step 1: ID Front
              </Text>
              <TouchableOpacity
                onPress={() => pickImage("front")}
                className="h-48 bg-white/10 rounded-2xl border-2 border-dashed border-white/20 items-center justify-center overflow-hidden"
              >
                {images.front ? (
                  <Image
                    source={{ uri: images.front }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="camera" size={40} color="white" />
                )}
              </TouchableOpacity>
            </View>

            <View className="bg-white/5 p-4 rounded-3xl border border-white/10">
              <Text className="text-white font-bold mb-4">
                Step 2: ID Back (Optional)
              </Text>
              <TouchableOpacity
                onPress={() => pickImage("back")}
                className="h-48 bg-white/10 rounded-2xl border-2 border-dashed border-white/20 items-center justify-center overflow-hidden"
              >
                {images.back ? (
                  <Image
                    source={{ uri: images.back }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="camera" size={40} color="white" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (!fullLegalName.trim()) {
                  Alert.alert("Error", "Please enter your full legal name.");
                  return;
                }
                if (!images.front) {
                  Alert.alert("Error", "Please upload the front of your ID.");
                  return;
                }
                setStep(2);
              }}
              className="h-16 rounded-2xl bg-[#FF4D00] items-center justify-center shadow-lg shadow-[#FF4D00]/20"
            >
              <Text className="text-white font-black uppercase tracking-widest">
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View className="space-y-6">
            <View className="bg-white/5 p-4 rounded-3xl border border-white/10">
              <Text className="text-white font-bold mb-2">
                Step 3: Liveness Selfie
              </Text>
              <Text className="text-gray-400 text-xs mb-4">
                Please take a clear photo of your face.
              </Text>
              <TouchableOpacity
                onPress={() => pickImage("selfie")}
                className="h-64 bg-white/10 rounded-2xl border-2 border-dashed border-white/20 items-center justify-center overflow-hidden"
              >
                {images.selfie ? (
                  <Image
                    source={{ uri: images.selfie }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={50} color="white" />
                )}
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={() => setStep(1)}
                className="flex-1 h-16 bg-gray-800 rounded-2xl items-center justify-center"
              >
                <Text className="text-white font-black uppercase tracking-widest">
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !images.selfie}
                className={`flex-[2] h-16 rounded-2xl items-center justify-center ${
                  !images.selfie || loading ? "bg-gray-800" : "bg-[#FF4D00]"
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-black uppercase tracking-widest">
                    Submit Review
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
