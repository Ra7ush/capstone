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
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useVerification } from "@/hooks";

export default function VerificationApply() {
  const router = useRouter();
  const { submitVerification, uploadImage, getCurrentUserId, isSubmitting } =
    useVerification();

  const [step, setStep] = useState(1);
  const [fullLegalName, setFullLegalName] = useState("");
  const [idType, setIdType] = useState("national_id");
  const [socialLinks, setSocialLinks] = useState({
    github: "",
    linkedin: "",
    instagram: "",
  });
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [images, setImages] = useState<{
    front: string | null;
    back: string | null;
    selfie: string | null;
  }>({
    front: null,
    back: null,
    selfie: null,
  });
  const [isUploading, setIsUploading] = useState(false);

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

  const handleSubmit = async () => {
    if (!images.front || !images.selfie) {
      Alert.alert("Error", "Please provide all required photos.");
      return;
    }

    setIsUploading(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Not authenticated");

      // 1. Upload images to Supabase Storage
      const frontUrl = await uploadImage(
        images.front,
        `${userId}/id_front_${Date.now()}.jpg`
      );

      let backUrl = null;
      if (images.back) {
        backUrl = await uploadImage(
          images.back,
          `${userId}/id_back_${Date.now()}.jpg`
        );
      }

      const selfieUrl = await uploadImage(
        images.selfie,
        `${userId}/selfie_${Date.now()}.jpg`
      );

      // 2. Submit verification via hook
      await submitVerification({
        full_legal_name: fullLegalName,
        id_type: idType,
        id_front_url: frontUrl,
        id_back_url: backUrl,
        selfie_url: selfieUrl,
        social_links: socialLinks,
        portfolio_url: portfolioUrl,
      });

      // 3. Success - navigate to tabs
      Alert.alert(
        "Success",
        "Verification submitted! Admins will review it soon.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = isSubmitting || isUploading;

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

            <TouchableOpacity
              onPress={() => {
                if (!fullLegalName.trim()) {
                  Alert.alert("Error", "Please enter your full legal name.");
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
            <View className="bg-white/5 p-5 rounded-3xl border border-white/10 space-y-4">
              <Text className="text-white font-bold mb-2">Social Links</Text>

              {[
                { id: "github", icon: "logo-github", color: "#FFF" },
                { id: "linkedin", icon: "logo-linkedin", color: "#0077B5" },
                { id: "instagram", icon: "logo-instagram", color: "#E4405F" },
              ].map((social) => (
                <View
                  key={social.id}
                  className="h-14 bg-white/10 rounded-2xl px-4 border border-white/10 flex-row items-center"
                >
                  <Ionicons
                    name={social.icon as any}
                    size={20}
                    color={social.color}
                  />
                  <TextInput
                    className="flex-1 text-white ml-3 font-medium"
                    placeholder={`${social.id.charAt(0).toUpperCase() + social.id.slice(1)} URL or @handle`}
                    placeholderTextColor="#6B7280"
                    value={(socialLinks as any)[social.id]}
                    onChangeText={(val) =>
                      setSocialLinks((prev) => ({ ...prev, [social.id]: val }))
                    }
                  />
                </View>
              ))}

              <View className="pt-4 border-t border-white/5">
                <Text className="text-white font-bold mb-2">
                  Portfolio / CV
                </Text>
                <View className="h-14 bg-white/10 rounded-2xl px-4 border border-white/10 flex-row items-center">
                  <Ionicons name="link-outline" size={20} color="#FF4D00" />
                  <TextInput
                    className="flex-1 text-white ml-3 font-medium"
                    placeholder="Link to your work"
                    placeholderTextColor="#6B7280"
                    value={portfolioUrl}
                    onChangeText={setPortfolioUrl}
                  />
                </View>
              </View>
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
                onPress={() => setStep(3)}
                className="flex-[2] h-16 rounded-2xl bg-[#FF4D00] items-center justify-center"
              >
                <Text className="text-white font-black uppercase tracking-widest">
                  Next Step
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="space-y-6">
            <View className="bg-white/5 p-4 rounded-3xl border border-white/10">
              <Text className="text-white font-bold mb-4">
                Step 3: ID Front
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
                Step 3: ID Back (Optional)
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

            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={() => setStep(2)}
                className="flex-1 h-16 bg-gray-800 rounded-2xl items-center justify-center"
              >
                <Text className="text-white font-black uppercase tracking-widest">
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!images.front) {
                    Alert.alert("Error", "Please upload the front of your ID.");
                    return;
                  }
                  setStep(4);
                }}
                className="flex-[2] h-16 rounded-2xl bg-[#FF4D00] items-center justify-center"
              >
                <Text className="text-white font-black uppercase tracking-widest">
                  Next Step
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View className="space-y-6">
            <View className="bg-white/5 p-4 rounded-3xl border border-white/10">
              <Text className="text-white font-bold mb-2">
                Step 4: Liveness Selfie
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
                onPress={() => setStep(3)}
                className="flex-1 h-16 bg-gray-800 rounded-2xl items-center justify-center"
              >
                <Text className="text-white font-black uppercase tracking-widest">
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading || !images.selfie}
                className={`flex-[2] h-16 rounded-2xl items-center justify-center ${
                  !images.selfie || isLoading ? "bg-gray-800" : "bg-[#FF4D00]"
                }`}
              >
                {isLoading ? (
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
