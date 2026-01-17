import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useAuthState } from "@/hooks/useAuthState";
import {
  useUser,
  useUpdateProfile,
  useCreatorProfile,
} from "@/hooks/useProfile";

export default function CommunityProfileEdit() {
  const router = useRouter();
  const { session } = useAuthState();
  const { data: creatorProfile } = useCreatorProfile(session?.user?.id || "");

  const [bio, setBio] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    if (!isDirty && creatorProfile?.bio !== undefined) {
      setBio(creatorProfile?.bio ?? "");
    }
  }, [creatorProfile?.bio, isDirty]);

  const { mutateAsync: updateProfile, isPending: loading } = useUpdateProfile();

  const handleSave = async () => {
    if (!session?.user?.id) return;
    try {
      await updateProfile({
        bio: bio,
      });
      router.back();
    } catch (error) {
      console.error("Error updating community profile:", error);
      Alert.alert("Error", "Failed to update community profile information.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Community Profile",
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
              Community Identity
            </Text>

            <View className="bg-gray-50 rounded-[2.5rem] p-4 border border-gray-100">
              <View>
                <Text className="text-gray-500 text-[10px] font-black uppercase mb-2 ml-4">
                  Professional Bio
                </Text>
                <TextInput
                  value={bio}
                  onChangeText={(text) => {
                    setBio(text);
                    setIsDirty(true);
                  }}
                  className="bg-white rounded-[2rem] p-4 font-bold text-black border border-gray-100"
                  placeholder="Tell the community about yourself"
                  placeholderTextColor="#d3d7ddff"
                  multiline
                  numberOfLines={6}
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
              <Ionicons name="heart-outline" size={18} color="black" />
              <Text className="font-black text-xs uppercase ml-2">
                Community Presence
              </Text>
            </View>
            <Text className="text-gray-500 text-xs font-medium leading-relaxed">
              Your professional bio is visible to the entire community. Use it
              to showcase your expertise and attract new followers.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
