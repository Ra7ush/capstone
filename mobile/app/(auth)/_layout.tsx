import { Stack } from "expo-router";

/**
 * Auth Routes Layout
 *
 * This layout wraps all authentication-related screens (login, signup, verify).
 * The auth guard logic is handled in the root _layout.tsx.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "white" },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
