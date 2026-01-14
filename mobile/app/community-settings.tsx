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

export default function CommunitySettings() {
  const router = useRouter();
  const [communityName, setCommunityName] = useState("UI/UX Designers Hub");
  const [privacy, setPrivacy] = useState<"public" | "private" | "restricted">(
    "public"
  );

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Community Settings",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons name="chevron-back" size={24} color="black" />
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
          {/* Banner Upload Area */}
          <Text className="text-gray-500 text-[10px] font-black uppercase mb-3 ml-1">
            Community Banner
          </Text>
          <TouchableOpacity className="w-full h-48 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 items-center justify-center mb-8 overflow-hidden">
            <View className="items-center">
              <Ionicons name="cloud-upload-outline" size={40} color="#9CA3AF" />
              <Text className="text-gray-400 font-bold mt-2">
                Click to upload or drag and drop
              </Text>
            </View>
          </TouchableOpacity>

          {/* Form Fields */}
          <View className="flex-row gap-4 mb-8">
            <View className="flex-1">
              <Text className="text-gray-500 text-[10px] font-black uppercase mb-2 ml-4">
                Community Name
              </Text>
              <TextInput
                value={communityName}
                onChangeText={setCommunityName}
                className="bg-white rounded-[1.5rem] p-4 font-bold text-black border border-gray-100 shadow-sm"
                placeholder="Name"
              />
            </View>

            <View className="flex-1">
              <Text className="text-gray-500 text-[10px] font-black uppercase mb-2 ml-4">
                Privacy
              </Text>
              <View className="bg-white rounded-[1.5rem] p-4 border border-gray-100 shadow-sm flex-row items-center justify-between">
                <Text className="font-bold text-black capitalize">
                  {privacy} (Anyone can join)
                </Text>
                <Ionicons name="chevron-down" size={16} color="black" />
              </View>
            </View>
          </View>

          {/* Footer Actions */}
          <View className="flex-row items-center justify-end gap-6 mt-8">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-gray-500 font-bold">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-black px-8 py-4 rounded-2xl flex-row items-center"
            >
              <Ionicons
                name="save-outline"
                size={18}
                color="white"
                className="mr-2"
              />
              <Text className="text-white font-black uppercase tracking-widest ml-2">
                Save Changes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
