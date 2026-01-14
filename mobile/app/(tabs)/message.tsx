import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

const MOCK_MESSAGES = [
  {
    id: "1",
    user: {
      name: "John Doe",
      avatar: "JD",
      avatarColor: "bg-blue-500",
      isOnline: true,
    },
    lastMessage: "Hey, do you have that updated design file?",
    time: "2m ago",
    unreadCount: 3,
  },
  {
    id: "2",
    user: {
      name: "Sarah Jenkins",
      avatar: "SJ",
      avatarColor: "bg-pink-500",
      isOnline: false,
    },
    lastMessage: "The community loved your last post! Keep it up!",
    time: "45m ago",
    unreadCount: 0,
  },
  {
    id: "3",
    user: {
      name: "Alex K.",
      avatar: "AK",
      avatarColor: "bg-purple-500",
      isOnline: true,
    },
    lastMessage: "Just booked a consultation for next Tuesday.",
    time: "3h ago",
    unreadCount: 1,
  },
  {
    id: "4",
    user: {
      name: "Marketing Team",
      avatar: "MT",
      avatarColor: "bg-green-500",
      isOnline: false,
    },
    lastMessage: "New campaign starts tomorrow at 9 AM.",
    time: "1d ago",
    unreadCount: 0,
  },
];

export default function Message() {
  const [search, setSearch] = useState("");

  const filteredMessages = MOCK_MESSAGES.filter(
    (msg) =>
      msg.user.name.toLowerCase().includes(search.toLowerCase()) ||
      msg.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 pt-16 pb-4 bg-white">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-black text-black">Messages</Text>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-black items-center justify-center">
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="bg-gray-50 flex-row items-center px-4 py-3 rounded-2xl border border-gray-100">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Search messages..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-black font-medium"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Active Chats List */}
        <View className="px-6 py-4">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
            Recent Conversations
          </Text>

          {filteredMessages.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              className="flex-row items-center mb-6"
            >
              {/* Avatar Container */}
              <View className="relative">
                <View
                  className={`w-14 h-14 rounded-full ${chat.user.avatarColor} items-center justify-center`}
                >
                  <Text className="text-white font-black text-lg">
                    {chat.user.avatar}
                  </Text>
                </View>
                {chat.user.isOnline && (
                  <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                )}
              </View>

              {/* Chat Info */}
              <View className="flex-1 ml-4 border-b border-gray-50 pb-4">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-black font-black text-base">
                    {chat.user.name}
                  </Text>
                  <Text className="text-gray-400 text-xs font-medium">
                    {chat.time}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`flex-1 text-sm mr-2 ${chat.unreadCount > 0 ? "text-gray-900 font-bold" : "text-gray-500 font-medium"}`}
                    numberOfLines={1}
                  >
                    {chat.lastMessage}
                  </Text>
                  {chat.unreadCount > 0 && (
                    <View className="bg-[#FF4D00] px-2 py-0.5 rounded-full min-w-[20px] items-center">
                      <Text className="text-white text-[10px] font-black">
                        {chat.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredMessages.length === 0 && (
            <View className="items-center justify-center py-20">
              <View className="w-20 h-20 rounded-full bg-gray-50 items-center justify-center mb-4">
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color="#D1D5DB"
                />
              </View>
              <Text className="text-gray-400 font-bold">
                No conversations found
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
