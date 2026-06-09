import React from "react";
import "../global.css";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthContext";
import { PresenceProvider } from "@/context/PresenceContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PresenceProvider>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </SafeAreaProvider>
        </PresenceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
