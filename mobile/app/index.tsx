import { Redirect } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import { Link, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthState } from "../hooks/useAuthState";
import LoadingScreen from "../components/LoadingScreen";

export default function Index() {
  const { isLoading, session, hasProfile } = useAuthState();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If user is fully authenticated, redirect to home
  if (session && hasProfile) {
    return <Redirect href="/(home)" />;
  }

  // Otherwise show the welcome/landing page
  return (
    <View className="flex-1 bg-white items-center justify-center p-8">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View className="items-center space-y-6">
        <View className="bg-black w-20 h-20 rounded-3xl items-center justify-center shadow-2xl rotate-3">
          <Text className="text-white text-4xl font-black italic">N</Text>
        </View>

        <View className="items-center space-y-2">
          <Text className="text-4xl font-black text-black tracking-tighter text-center">
            Nexus<Text className="text-gray-300">Hub</Text>
          </Text>
          <Text className="text-gray-400 font-bold text-center px-8">
            The ultimate workflow platform for modern creators.
          </Text>
        </View>

        <View className="h-8" />

        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity className="bg-black px-8 py-4 rounded-2xl shadow-lg active:scale-95 transition-all">
            <Text className="text-white font-black uppercase tracking-[0.2em] text-xs">
              Get Started
            </Text>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="mt-4 px-8 py-3">
            <Text className="text-gray-500 font-bold text-sm">
              Already have an account?{" "}
              <Text className="text-black">Log In</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
