import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useAuthState } from "@/hooks/useAuthState";
import { useUpdateProfile } from "@/hooks/useProfile";
import { Alert } from "react-native";

export default function ProfileEdit() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = params.mode as string;
  const { user } = useAuthState();
  const profile = user?.profile;

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const { mutateAsync: updateProfile, isPending: loading } = useUpdateProfile();

  const isBioOnly = mode === "bio";

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      await updateProfile({
        full_name: isBioOnly ? undefined : fullName,
        username: isBioOnly ? undefined : username,
        bio: bio,
      });
      router.back();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile information.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: isBioOnly ? "Edit Biography" : "Personal Information",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              className="mr-2"
            >
              <Text
                className={`font-black uppercase tracking-widest ${loading ? "text-gray-400" : "text-[#FF4D00]"}`}
              >
                {loading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          ),
          headerTitleStyle: {
            fontFamily: "System",
            fontWeight: "900",
          },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "white" },
        }}
      />
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-8">
          <View className="mb-8">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">
              {isBioOnly ? "Your Story" : "Basic Protocol"}
            </Text>

            <View className="bg-gray-50 rounded-[2.5rem] p-4 border border-gray-100">
              {!isBioOnly && (
                <>
                  <View className="mb-6">
                    <Text className="text-gray-500 text-[10px] font-black uppercase mb-2 ml-4">
                      Full Name
                    </Text>
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      className="bg-white rounded-[2rem] p-4 font-bold text-black border border-gray-100"
                      placeholder="Enter your full name"
                      placeholderTextColor="#d3d7ddff"
                    />
                  </View>

                  <View className="mb-6">
                    <Text className="text-gray-500 text-[10px] font-black uppercase mb-2 ml-4">
                      Username
                    </Text>
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      className="bg-white rounded-[2rem] p-4 font-bold text-black border border-gray-100"
                      placeholder="Enter username"
                      placeholderTextColor="#d3d7ddff"
                      autoCapitalize="none"
                    />
                  </View>
                </>
              )}

              <View>
                <Text className="text-gray-500 text-[10px] font-black uppercase mb-2 ml-4">
                  Biography
                </Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  className="bg-white rounded-[2rem] p-6 font-bold text-black border border-gray-100 min-h-[160px]"
                  placeholder="Tell the community about yourself..."
                  placeholderTextColor="#d3d7ddff"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <View className="bg-black/5 rounded-[2rem] p-6 border border-black/5">
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="black"
              />
              <Text className="font-black text-xs uppercase ml-2">
                {isBioOnly ? "Community Presence" : "Identity Node"}
              </Text>
            </View>
            <Text className="text-gray-500 text-xs font-medium leading-relaxed">
              {isBioOnly
                ? "Your biography helps community members learn more about you. Keep it professional and engaging to build trust within the protocol."
                : "Updating your identity parameters will synchronize across the Nexus Protocol. Changes are permanent once committed to the secure ledger."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
