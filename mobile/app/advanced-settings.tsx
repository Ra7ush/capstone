import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function AdvancedSettings() {
  const router = useRouter();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  type SettingItem =
    | {
        id: string;
        icon: string;
        label: string;
        type: "switch";
        value: boolean;
        onToggle: (val: boolean) => void;
      }
    | {
        id: string;
        icon: string;
        label: string;
        type: "link";
        value?: string;
        onPress: () => void;
      };

  const settingGroups: { title: string; items: SettingItem[] }[] = [
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
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)");
                }
              }}
              className="ml-2"
            >
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
                {group.items.map((item, itemIdx) => {
                  const isLast = itemIdx === group.items.length - 1;
                  const RowContainer =
                    item.type === "link" ? TouchableOpacity : View;

                  return (
                    <RowContainer
                      key={item.id}
                      onPress={item.type === "link" ? item.onPress : undefined}
                      activeOpacity={0.7}
                      className={`bg-white rounded-[2rem] p-4 flex-row items-center mb-1 ${
                        isLast ? "mb-0" : ""
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
                        <Text className="text-black font-bold">
                          {item.label}
                        </Text>
                        {typeof item.value === "string" && (
                          <Text className="text-gray-400 text-[10px] font-bold uppercase mt-0.5">
                            {item.value}
                          </Text>
                        )}
                      </View>

                      {item.type === "switch" ? (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{ false: "#E5E7EB", true: "#000000" }}
                          thumbColor="#FFFFFF"
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#D1D5DB"
                        />
                      )}
                    </RowContainer>
                  );
                })}
              </View>
            </View>
          ))}

          <Text className="text-center text-gray-300 text-[10px] font-black uppercase tracking-widest mt-12 mb-8">
            Privacy Policy • Security Whitepaper
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
