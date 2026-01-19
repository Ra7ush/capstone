import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Alert,
  ActionSheetIOS,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Community as CommunityType } from "../../hooks/useCommunity";

interface CommunityCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<any>;
  uploadImage: (uri: string) => Promise<string>;
  onSuccess?: (community: CommunityType) => void;
}

export const CommunityCreationModal = ({
  visible,
  onClose,
  onCreate,
  uploadImage,
  onSuccess,
}: CommunityCreationModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [privacy, setPrivacy] = useState("public");
  const [banner, setBanner] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const screenHeight = Dimensions.get("window").height;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const categories = [
    "Art",
    "Health",
    "Gaming",
    "Tech",
    "Business",
    "Lifestyle",
    "Education",
  ];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleCreate = async () => {
    if (!name) return Alert.alert("Error", "Please enter a name");
    setIsSubmitting(true);
    try {
      let bannerUrl = "";
      if (banner) bannerUrl = await uploadImage(banner);
      const response = await onCreate({
        name,
        description,
        category,
        privacy,
        banner_url: bannerUrl,
      });
      setName("");
      setDescription("");
      setBanner("");
      handleClose();
      if (response?.data && onSuccess) {
        onSuccess(response.data);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to create community");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Photo Library", "Take Photo", "Browse Files"],
          cancelButtonIndex: 0,
          title: "Select Banner Image",
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await pickFromLibrary();
          } else if (buttonIndex === 2) {
            await pickFromCamera();
          } else if (buttonIndex === 3) {
            await pickFromFiles();
          }
        },
      );
    } else {
      await pickFromLibrary();
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setBanner(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Could not load the image.");
    }
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setBanner(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Could not access camera.");
    }
  };

  const pickFromLibrary = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setBanner(result.assets[0].uri);
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
            { text: "Browse Files", onPress: pickFromFiles },
          ],
        );
      } else {
        Alert.alert("Error", "Could not load the image. Please try again.");
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Animated.View
        style={{ opacity: fadeAnim }}
        className="absolute top-0 bottom-0 left-0 right-0 bg-black/60"
      >
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>
      <Animated.View
        style={{
          height: "100%",
          justifyContent: "flex-end",
          transform: [{ translateY: slideAnim }],
        }}
        pointerEvents="box-none"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="bg-white rounded-t-[20px]"
        >
          <View className="items-center pt-3">
            <View className="w-9 h-1 bg-gray-300 rounded-full" />
          </View>
          <View className="flex-row items-center justify-center py-3 border-b border-gray-200 relative">
            <Text className="font-semibold text-[16px]">Create Community</Text>
            <TouchableOpacity
              className="absolute right-4"
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="px-6 pt-4"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={pickImage}
              className="w-full h-32 bg-gray-100 rounded-xl items-center justify-center mb-4 overflow-hidden"
            >
              {banner ? (
                <Image source={{ uri: banner }} className="w-full h-full" />
              ) : (
                <View className="items-center">
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                  <Text className="text-gray-400 text-xs mt-2">
                    Add Banner Image
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TextInput
              className="bg-gray-100 p-4 rounded-xl font-medium mb-3"
              placeholder="Community Name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className="bg-gray-100 p-4 rounded-xl font-medium min-h-[80px] mb-3"
              placeholder="Description (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <Text className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`mr-2 px-4 py-2 rounded-full ${category === cat ? "bg-black" : "bg-gray-100"}`}
                >
                  <Text
                    className={`font-semibold text-sm ${category === cat ? "text-white" : "text-gray-600"}`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">
              Privacy
            </Text>
            <View className="flex-row gap-2 mb-6">
              {["public", "private"].map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPrivacy(p)}
                  className={`flex-1 py-3 rounded-xl border ${privacy === p ? "bg-black border-black" : "bg-white border-gray-200"}`}
                >
                  <View className="items-center">
                    <Ionicons
                      name={
                        p === "public" ? "globe-outline" : "lock-closed-outline"
                      }
                      size={20}
                      color={privacy === p ? "white" : "#4B5563"}
                    />
                    <Text
                      className={`font-bold mt-1 capitalize ${privacy === p ? "text-white" : "text-gray-600"}`}
                    >
                      {p}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl items-center bg-black mb-8"
            >
              <Text className="text-white font-black">
                {isSubmitting ? "Creating..." : "Create Community"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};
