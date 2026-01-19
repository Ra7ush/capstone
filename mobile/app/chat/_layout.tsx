import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "white" },
        headerTintColor: "black",
        headerShadowVisible: false,
      }}
    />
  );
}
