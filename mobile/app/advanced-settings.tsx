import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function AdvancedSettings() {
  const router = useRouter();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  const settingGroups = [
    {
      title: "Account Security",
      items: [
        {
          id: "email",
          icon: "mail-outline",
          label: "Email Address",
          value: "meerra...blue@email.com",
          type: "link",
        },
        {
          id: "2fa",
          icon: "shield-checkmark-outline",
          label: "Two-Factor Auth",
          value: is2FAEnabled,
          onToggle: setIs2FAEnabled,
          type: "switch",
        },
        {
          id: "password",
          icon: "lock-closed-outline",
          label: "Change Password",
          type: "link",
        },
      ],
    },
    {
      title: "Privacy & Visibility",
      items: [
        {
          id: "visibility",
          icon: "eye-outline",
          label: "Public Profile",
          value: profileVisibility,
          onToggle: setProfileVisibility,
          type: "switch",
        },
        {
          id: "blocked",
          icon: "ban-outline",
          label: "Blocked Creators",
          value: "12 users",
          type: "link",
        },
      ],
    },
    {
      title: "Notification Protocol",
      items: [
        {
          id: "push",
          icon: "notifications-outline",
          label: "Push Notifications",
          value: pushNotifications,
          onToggle: setPushNotifications,
          type: "switch",
        },
        {
          id: "email_notif",
          icon: "at-outline",
          label: "Email Summaries",
          value: emailUpdates,
          onToggle: setEmailUpdates,
          type: "switch",
        },
      ],
    },
  ];

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Advanced Settings",
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
          {settingGroups.map((group, idx) => (
            <View key={idx} className="mb-8">
              <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">
                {group.title}
              </Text>
              <View className="bg-gray-50 rounded-[2.5rem] p-2 border border-gray-100">
                {group.items.map((item, itemIdx) => (
                  <View
                    key={item.id}
                    className={`bg-white rounded-[2rem] p-4 flex-row items-center mb-1 ${
                      itemIdx === group.items.length - 1 ? "mb-0" : ""
                    }`}
                  >
                    <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3">
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color="black"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-black font-bold">{item.label}</Text>
                      {typeof item.value === "string" && (
                        <Text className="text-gray-400 text-[10px] font-bold uppercase mt-0.5">
                          {item.value}
                        </Text>
                      )}
                    </View>

                    {item.type === "switch" ? (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={item.onToggle}
                        trackColor={{ false: "#E5E7EB", true: "#000000" }}
                        thumbColor="#FFFFFF"
                      />
                    ) : (
                      <TouchableOpacity>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#D1D5DB"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Dangerous Zone */}
          <View className="mt-8">
            <Text className="text-xs font-black text-red-400 uppercase tracking-widest mb-4 px-1">
              Dangerous Protocol
            </Text>
            <View className="bg-red-50 rounded-[2.5rem] p-2 border border-red-100">
              <TouchableOpacity className="bg-white rounded-[2rem] p-4 flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-red-500 items-center justify-center mr-3">
                  <Ionicons name="trash-outline" size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-red-500 font-bold">Delete Account</Text>
                  <Text className="text-red-300 text-[10px] font-bold uppercase mt-0.5">
                    Permanent Action
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#FECACA" />
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-center text-gray-300 text-[10px] font-black uppercase tracking-widest mt-12 mb-8">
            Privacy Policy • Security Whitepaper
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
