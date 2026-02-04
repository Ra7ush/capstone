import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useProfile";
import { useAuthState } from "@/hooks/useAuthState";

/**
 * User Home Screen - Patreon-style Mockup
 */
export default function UserHome() {
  const router = useRouter();
  const { user: authUser } = useAuthState();
  const { data: dbUser } = useUser();
  const profile = dbUser || authUser?.profile;

  const handleProfilePress = () => {
    router.push("/(user)/profile");
  };

  const categories = [
    { name: "Art", icon: "palette", type: "material" },
    { name: "Music", icon: "musical-notes", type: "ionicons" },
    { name: "Games", icon: "game-controller", type: "ionicons" },
    { name: "Podcast", icon: "mic", type: "ionicons" },
    { name: "Writing", icon: "pencil", type: "ionicons" },
    { name: "Photography", icon: "camera", type: "material" },
  ];

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4">
        <Text className="text-2xl font-black tracking-tighter text-black">
          NEXUS
        </Text>
        <TouchableOpacity
          onPress={handleProfilePress}
          className="w-10 h-10 rounded-full bg-[#FF4D00] items-center justify-center border border-gray-100 overflow-hidden"
        >
          {profile?.avatar_url || profile?.profile_image_url ? (
            <Image
              source={{ uri: profile.avatar_url || profile.profile_image_url }}
              className="w-full h-full"
            />
          ) : (
            <Text className="text-white text-lg font-black italic">
              {profile?.username?.[0]?.toUpperCase() || "N"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      >
        {/* Discovery Title */}
        <View className="mt-12 mb-10">
          <Text className="text-[28px] font-black text-center leading-9 text-black">
            Discover over 250,000 creators on Nexus
          </Text>
        </View>

        {/* Search Bar */}
        <View className="bg-gray-100 rounded-xl px-4 flex-row items-center mb-10 h-12">
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            placeholder="Find a Creator"
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-base text-black h-full py-0"
            style={{ includeFontPadding: false }}
          />
        </View>

        {/* Category Grid */}
        <View className="flex-row flex-wrap justify-between">
          {categories.map((item, index) => (
            <TouchableOpacity
              key={index}
              className="w-[48%] bg-gray-100 rounded-2xl p-6 mb-4 items-center"
              activeOpacity={0.7}
            >
              <View className="mb-4">
                {item.type === "material" ? (
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={32}
                    color="black"
                  />
                ) : (
                  <Ionicons name={item.icon as any} size={32} color="black" />
                )}
              </View>
              <Text className="text-lg font-bold text-black text-center">
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
