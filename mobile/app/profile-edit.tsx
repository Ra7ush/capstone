import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useAuthState } from "@/hooks/useAuthState";
import { useUpdateProfile } from "@/hooks/useUser";
import { Alert } from "react-native";

export default function ProfileEdit() {
  const router = useRouter();
  const { user } = useAuthState();
  const profile = user?.profile;

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const { mutateAsync: updateProfile, isPending: loading } = useUpdateProfile();

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      await updateProfile({
        userId: user.id,
        full_name: fullName,
        username: username,
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
          title: "Personal Information",
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
              Basic Protocol
            </Text>

            <View className="bg-gray-50 rounded-[2.5rem] p-4 border border-gray-100">
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

              <View>
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
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">
              Identity Data
            </Text>

            <View className="bg-gray-50 rounded-[2.5rem] p-4 border border-gray-100">
              <View>
                <Text className="text-gray-500 text-[10px] font-black uppercase mb-2 ml-4">
                  Professional Bio
                </Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  className="bg-white rounded-[2rem] p-4 font-bold text-black border border-gray-100"
                  placeholder="Tell the community about yourself"
                  placeholderTextColor="#d3d7ddff"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text className="text-[9px] text-gray-400 font-bold mt-2 mr-4 text-right uppercase">
                  {bio.length} / 500
                </Text>
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
                Identity Node
              </Text>
            </View>
            <Text className="text-gray-500 text-xs font-medium leading-relaxed">
              Updating your identity parameters will synchronize across the
              Nexus Protocol. Changes are permanent once committed to the secure
              ledger.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
