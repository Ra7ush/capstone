import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { AVATARS } from "@/constants";

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);
  const [isCreator, setIsCreator] = useState(false);
  const [bio, setBio] = useState("");

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || null);
      } else {
        // No user, redirect to login
        router.replace("/(auth)/login");
      }
    };
    getUser();
  }, [router]);

  const handleComplete = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

    if (!userId || !email) {
      Alert.alert("Error", "User session not found. Please login again.");
      router.replace("/(auth)/login");
      return;
    }

    setLoading(true);
    try {
      // 1. Upsert into users table (insert or update if exists)
      const { error: userError } = await supabase.from("users").upsert(
        {
          id: userId,
          email: email,
          password_hash: "supabase_auth_managed", // Placeholder - Supabase Auth handles passwords
          username: username.trim(),
          role: isCreator ? "creator" : "user",
          status: "active",
          profile_image_url: selectedAvatar,
        },
        { onConflict: "id" }
      );

      if (userError) {
        // Check for duplicate username
        if (
          userError.code === "23505" &&
          userError.message.includes("username")
        ) {
          throw new Error("Username already taken. Please choose another.");
        }
        throw userError;
      }

      // 2. If creator, upsert into creators table
      if (isCreator) {
        const { error: creatorError } = await supabase.from("creators").upsert(
          {
            user_id: userId,
            bio: bio.trim() || null,
            verification_status: "unverified",
          },
          { onConflict: "user_id" }
        );

        if (creatorError) throw creatorError;
      }

      Alert.alert(
        "Profile Created!",
        isCreator
          ? "Next, you need to verify your identity to start sharing your work."
          : "Your nexus profile is ready!",
        [
          {
            text: isCreator ? "Start Verification" : "Let's Go!",
            onPress: () =>
              router.replace(isCreator ? "/verification-apply" : "/(tabs)"),
          },
        ]
      );
    } catch (error: any) {
      console.error("Onboarding error:", error);
      Alert.alert("Setup Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-8 pt-16 pb-8">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-xs font-black text-gray-300 uppercase tracking-widest mb-2">
            Step 2 of 2
          </Text>
          <Text className="text-3xl font-black text-black tracking-tighter">
            Complete Your{"\n"}Profile
          </Text>
        </View>

        {/* Username Input */}
        <View className="mb-8">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Choose a Username
          </Text>
          <View className="h-14 bg-gray-50 rounded-2xl flex-row items-center px-4 border-2 border-gray-100">
            <Ionicons name="at" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-3 font-bold text-black text-base"
              placeholder="username"
              placeholderTextColor="#D1D5DB"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
          </View>
        </View>

        {/* Avatar Selection */}
        <View className="mb-8">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Pick an Avatar
          </Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((avatar, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedAvatar(avatar)}
                style={[
                  styles.avatarItem,
                  selectedAvatar === avatar && styles.avatarSelected,
                ]}
              >
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
                {selectedAvatar === avatar && (
                  <View style={styles.avatarCheck}>
                    <Ionicons name="checkmark" size={14} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Creator Toggle */}
        <View className="mb-6">
          <View className="bg-gray-50 rounded-2xl p-5 flex-row items-center justify-between border-2 border-gray-100">
            <View className="flex-1 mr-4">
              <Text className="text-base font-black text-black mb-1">
                I'm a Creator
              </Text>
              <Text className="text-xs text-gray-400 font-medium">
                Enable to sell products and services
              </Text>
            </View>
            <Switch
              value={isCreator}
              onValueChange={setIsCreator}
              trackColor={{ false: "#E5E7EB", true: "#000000" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Bio Input (only for creators) */}
        {isCreator && (
          <View className="mb-8">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
              Tell Us About You
            </Text>
            <View className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-100 min-h-[120px]">
              <TextInput
                className="font-medium text-black text-base"
                placeholder="Write a short bio to introduce yourself to your audience..."
                placeholderTextColor="#D1D5DB"
                multiline
                textAlignVertical="top"
                value={bio}
                onChangeText={setBio}
              />
            </View>
          </View>
        )}

        {/* Complete Button */}
        <TouchableOpacity
          onPress={handleComplete}
          disabled={loading}
          className="w-full h-16 bg-black rounded-2xl items-center justify-center"
          style={{ opacity: loading ? 0.8 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center">
              <Text className="text-white text-sm font-black uppercase tracking-widest mr-2">
                Complete Setup
              </Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  avatarItem: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 3,
    borderColor: "transparent",
    overflow: "hidden",
    position: "relative",
  },
  avatarSelected: {
    borderColor: "#000000",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarCheck: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
});
