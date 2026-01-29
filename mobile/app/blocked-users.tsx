import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useBlocking";
import { Button } from "@/components/ui";

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { data: blockedUsers, isLoading } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  const handleUnblock = (userId: string, username: string) => {
    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock @${username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "destructive",
          onPress: () => unblockMutation.mutate(userId),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Blocked Creators",
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="black" />
        </View>
      ) : blockedUsers?.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-6">
            <Ionicons name="ban-outline" size={40} color="#D1D5DB" />
          </View>
          <Text className="text-xl font-black italic mb-2">Clean Slate</Text>
          <Text className="text-gray-400 text-center font-bold uppercase tracking-widest text-[10px]">
            You haven't blocked any creators yet.{"\n"}Keep the vibes positive.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-4">
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">
            Blocked Protocol ({blockedUsers?.length})
          </Text>

          <View className="bg-gray-50 rounded-[2.5rem] p-2 border border-gray-100">
            {blockedUsers?.map((user: any, idx: number) => {
              const isLast = idx === blockedUsers.length - 1;
              return (
                <View
                  key={user.id}
                  className={`bg-white rounded-[2rem] p-4 flex-row items-center mb-1 ${
                    isLast ? "mb-0" : ""
                  }`}
                >
                  <Image
                    source={{
                      uri:
                        user.profile_image_url ||
                        `https://api.dicebear.com/7.x/avataaars/png?seed=${user.username}`,
                    }}
                    className="w-12 h-12 rounded-full border-2 border-gray-50"
                  />

                  <View className="flex-1 ml-3">
                    <Text className="text-black font-bold">
                      {user.full_name || user.username}
                    </Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase">
                      @{user.username}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleUnblock(user.id, user.username)}
                    className="bg-gray-50 px-4 py-2 rounded-full border border-gray-100"
                  >
                    <Text className="text-black font-black uppercase text-[10px] tracking-widest">
                      Unblock
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <Text className="text-center text-gray-300 text-[10px] font-bold uppercase tracking-widest mt-12 mb-8 leading-relaxed">
            Blocked users cannot view your profile, posts,{"\n"}or message you
            directly.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
