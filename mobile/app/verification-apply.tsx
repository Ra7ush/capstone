import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  ActionSheetIOS,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useVerification } from "@/hooks";
import { Input, Button } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { mmkvStorage } from "@/lib/storage";

const VERIFICATION_DRAFT_KEY = "@verification_apply_draft";

export default function VerificationApply() {
  const router = useRouter();
  const {
    submitVerification,
    uploadImage,
    getCurrentUserId,
    isSubmitting,
    verificationStatus,
    isLoadingStatus,
  } = useVerification();

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
  const [isDraftLoading, setIsDraftLoading] = useState(true);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draftJson = mmkvStorage.getItem(VERIFICATION_DRAFT_KEY);
        if (draftJson) {
          const draft = JSON.parse(draftJson);
          setStep(draft.step || 1);
          setFullLegalName(draft.fullLegalName || "");
          setIdType(draft.idType || "national_id");
          setSocialLinks(
            draft.socialLinks || { github: "", linkedin: "", instagram: "" },
          );
          setPortfolioUrl(draft.portfolioUrl || "");
          // We don't restore images for now as temporary URIs might be expired
          // but we could if we want to be aggressive.
        }
      } catch (e) {
        console.error("Failed to load verification draft", e);
      } finally {
        setIsDraftLoading(false);
      }
    };
    loadDraft();
  }, []);

  // Save draft on changes
  useEffect(() => {
    if (isDraftLoading) return;

    const saveDraft = async () => {
      try {
        const draft = {
          step,
          fullLegalName,
          idType,
          socialLinks,
          portfolioUrl,
        };
        mmkvStorage.setItem(VERIFICATION_DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.error("Failed to save verification draft", e);
      }
    };
    saveDraft();
  }, [step, fullLegalName, idType, socialLinks, portfolioUrl, isDraftLoading]);

  const pickFromFiles = async (type: "front" | "back" | "selfie") => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImages((prev) => ({ ...prev, [type]: result.assets[0].uri }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const pickImage = async (type: "front" | "back" | "selfie") => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Photo Library", "Browse Files"],
          cancelButtonIndex: 0,
          title: `Capture ${type === "selfie" ? "Selfie" : "ID " + type.charAt(0).toUpperCase() + type.slice(1)}`,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await pickFromCamera(type);
          } else if (buttonIndex === 2) {
            await pickFromLibrary(type);
          } else if (buttonIndex === 3) {
            await pickFromFiles(type);
          }
        },
      );
    } else {
      // Android - prefer camera for verification
      await pickFromCamera(type);
    }
  };

  const pickFromCamera = async (type: "front" | "back" | "selfie") => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is needed for verification.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImages((prev) => ({ ...prev, [type]: result.assets[0].uri }));
      }
    } catch {
      // Fallback to library
      await pickFromLibrary(type);
    }
  };

  const pickFromLibrary = async (type: "front" | "back" | "selfie") => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed for verification.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImages((prev) => ({ ...prev, [type]: result.assets[0].uri }));
      }
    } catch (error: any) {
      console.error("Error picking image:", error);

      // iOS PHPicker bug - offer Document Picker as fallback
      if (
        error?.message?.includes("public.jpeg") ||
        error?.message?.includes("public.heic") ||
        error?.message?.includes("representation")
      ) {
        Alert.alert(
          "Image Loading Issue",
          "There was a problem loading that image. Would you like to try the file browser instead?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Browse Files",
              onPress: () => pickFromFiles(type),
            },
          ],
        );
      } else {
        Alert.alert("Error", "Could not load the image. Please try again.");
      }
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
        `${userId}/id_front_${Date.now()}.jpg`,
      );

      let backUrl = null;
      if (images.back) {
        backUrl = await uploadImage(
          images.back,
          `${userId}/id_back_${Date.now()}.jpg`,
        );
      }

      const selfieUrl = await uploadImage(
        images.selfie,
        `${userId}/selfie_${Date.now()}.jpg`,
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

      // Clear draft on success
      mmkvStorage.removeItem(VERIFICATION_DRAFT_KEY);

      // 3. Success - navigate to tabs
      Alert.alert(
        "Success",
        "Verification submitted! Admins will review it soon.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = isSubmitting || isUploading;

  const renderProgress = () => (
    <View className="flex-row gap-2 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <View
          key={s}
          className={`h-1 flex-1 rounded-full ${
            s <= step ? "bg-[#FF4D00]" : "bg-white/10"
          }`}
        />
      ))}
    </View>
  );

  if (isDraftLoading || isLoadingStatus) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#FF4D00" />
      </View>
    );
  }

  if (verificationStatus === "pending") {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 px-6 items-center justify-center">
          <View className="w-24 h-24 rounded-full bg-yellow-500/10 items-center justify-center mb-8">
            <Ionicons name="time-outline" size={48} color="#EAB308" />
          </View>
          <Text className="text-3xl font-black text-white italic text-center mb-4">
            Under<Text className="text-yellow-500">Review</Text>
          </Text>
          <Text className="text-gray-400 font-bold text-center leading-6 mb-12">
            Your identity nodes are currently being synchronized with the Nexus
            Protocol compliance engine. Our ambassadors will verify your
            credentials shortly.
          </Text>
          <Button
            title="Return to Protocol"
            onPress={() => router.replace("/(tabs)/profile")}
            variant="outline"
            textColor="white"
            className="w-full border-white/10"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6">
        <View className="py-8 pb-32">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-4xl font-black text-white italic tracking-tighter">
              Identity<Text className="text-[#FF4D00]">Check</Text>
            </Text>
            <Text className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">
              Kurdistan Region Creator Portal
            </Text>
          </View>

          {renderProgress()}

          {step === 1 && (
            <View className="gap-8">
              <View className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 gap-6">
                <Input
                  label="Legal Full Name"
                  placeholder="As shown on your ID Card"
                  value={fullLegalName}
                  onChangeText={setFullLegalName}
                  icon="person-outline"
                />

                <View>
                  <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3">
                    ID Document Type
                  </Text>
                  <View className="flex-row gap-3">
                    {[
                      { id: "national_id", label: "National ID" },
                      { id: "passport", label: "Passport" },
                    ].map((type) => (
                      <Button
                        key={type.id}
                        title={type.label}
                        onPress={() => setIdType(type.id)}
                        variant={idType === type.id ? "brand" : "outline"}
                        textColor="white"
                        className={`flex-1 ${
                          idType === type.id
                            ? "border-[#FF4D00]"
                            : "border-white/10"
                        }`}
                        size="sm"
                      />
                    ))}
                  </View>
                </View>
              </View>

              <Button
                title="Continue"
                onPress={() => {
                  if (!fullLegalName.trim()) {
                    Alert.alert("Error", "Please enter your full legal name.");
                    return;
                  }
                  setStep(2);
                }}
                variant="brand"
                icon="arrow-forward"
                iconPosition="right"
              />
            </View>
          )}

          {step === 2 && (
            <View className="gap-8">
              <View className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 gap-6">
                <View>
                  <Text className="text-xl font-black text-white mb-4">
                    ID Documents
                  </Text>

                  <Text className="text-white font-bold mb-3 px-1 text-sm">
                    ID Front Side
                  </Text>
                  <TouchableOpacity
                    onPress={() => pickImage("front")}
                    className="h-56 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 items-center justify-center overflow-hidden"
                  >
                    {images.front ? (
                      <Image
                        source={{ uri: images.front }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center">
                        <Ionicons name="camera" size={40} color="#6B7280" />
                        <Text className="text-gray-500 font-bold mt-2">
                          Tap to Scan Front
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="text-white font-bold mb-3 px-1 text-sm">
                    ID Back Side (Optional)
                  </Text>
                  <TouchableOpacity
                    onPress={() => pickImage("back")}
                    className="h-56 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 items-center justify-center overflow-hidden"
                  >
                    {images.back ? (
                      <Image
                        source={{ uri: images.back }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center">
                        <Ionicons name="camera" size={40} color="#6B7280" />
                        <Text className="text-gray-500 font-bold mt-2">
                          Tap to Scan Back
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row gap-4">
                <Button
                  title="Back"
                  onPress={() => setStep(1)}
                  variant="outline"
                  textColor="white"
                  className="flex-1 border-white/10"
                />
                <Button
                  title="Continue"
                  onPress={() => {
                    if (!images.front) {
                      Alert.alert(
                        "Error",
                        "Please upload the front of your ID.",
                      );
                      return;
                    }
                    setStep(3);
                  }}
                  variant="brand"
                  className="flex-[2]"
                  icon="arrow-forward"
                  iconPosition="right"
                />
              </View>
            </View>
          )}

          {step === 3 && (
            <View className="gap-8">
              <View className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 gap-6">
                <View>
                  <Text className="text-xl font-black text-white">
                    Liveness Check
                  </Text>
                  <Text className="text-gray-400 font-bold mt-1 mb-6 text-xs">
                    Please take a clear photo of your face.
                  </Text>

                  <TouchableOpacity
                    onPress={() => pickImage("selfie")}
                    className="aspect-square bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10 items-center justify-center overflow-hidden"
                  >
                    {images.selfie ? (
                      <Image
                        source={{ uri: images.selfie }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center">
                        <Ionicons name="person" size={60} color="#6B7280" />
                        <Text className="text-gray-500 font-bold mt-4">
                          Take Verification Selfie
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row gap-4">
                <Button
                  title="Back"
                  onPress={() => setStep(2)}
                  variant="outline"
                  textColor="white"
                  className="flex-1 border-white/10"
                />
                <Button
                  title="Continue"
                  onPress={() => {
                    if (!images.selfie) {
                      Alert.alert("Error", "Please take a clear selfie photo.");
                      return;
                    }
                    setStep(4);
                  }}
                  variant="brand"
                  className="flex-[2]"
                  icon="arrow-forward"
                  iconPosition="right"
                  disabled={!images.selfie}
                />
              </View>
            </View>
          )}

          {step === 4 && (
            <View className="gap-8">
              <View className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 gap-6">
                <View>
                  <Text className="text-xl font-black text-white">
                    Links & Portfolio
                  </Text>
                  <Text className="text-gray-400 font-bold mt-1 mb-6 text-xs">
                    Help us understand your work better.
                  </Text>

                  <View className="gap-4">
                    <Input
                      label="GitHub"
                      placeholder="github.com/username"
                      value={socialLinks.github}
                      onChangeText={(val) =>
                        setSocialLinks((p) => ({ ...p, github: val }))
                      }
                      icon="logo-github"
                    />
                    <Input
                      label="LinkedIn"
                      placeholder="linkedin.com/in/username"
                      value={socialLinks.linkedin}
                      onChangeText={(val) =>
                        setSocialLinks((p) => ({ ...p, linkedin: val }))
                      }
                      icon="logo-linkedin"
                    />
                    <Input
                      label="Instagram"
                      placeholder="@username"
                      value={socialLinks.instagram}
                      onChangeText={(val) =>
                        setSocialLinks((p) => ({ ...p, instagram: val }))
                      }
                      icon="logo-instagram"
                    />
                    <View className="pt-2">
                      <Input
                        label="Portfolio / CV (Optional)"
                        placeholder="https://yourportfolio.com"
                        value={portfolioUrl}
                        onChangeText={setPortfolioUrl}
                        icon="link-outline"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-4">
                <Button
                  title="Back"
                  onPress={() => setStep(3)}
                  variant="outline"
                  textColor="white"
                  className="flex-1 border-white/10"
                />
                <Button
                  title="Submit Review"
                  onPress={handleSubmit}
                  loading={isLoading}
                  variant="brand"
                  className="flex-[2]"
                  icon="cloud-upload-outline"
                  iconPosition="left"
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
