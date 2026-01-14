import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Tabs Layout
 *
 * Main tab navigation for authenticated users.
 * Add more Tab.Screen entries as you build out the app.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="service"
        options={{
          title: "Service",
          tabBarIcon: ({ focused }) => (
            <View
              className={`w-14 h-14 rounded-full items-center justify-center -mt-8 border-4 border-white ${
                focused ? "bg-[#FF4D00]" : "bg-black"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 8,
              }}
            >
              <Ionicons name="briefcase" size={24} color="white" />
            </View>
          ),
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "900",
            marginTop: 14, // Push label down to clear the larger button
          },
        }}
      />
      <Tabs.Screen
        name="message"
        options={{
          title: "Message",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
