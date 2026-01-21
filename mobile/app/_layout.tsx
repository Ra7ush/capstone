import { useEffect, useRef } from "react";
import { LogBox, AppState, AppStateStatus } from "react-native";
import { Stack, useRouter, useSegments, SplashScreen } from "expo-router";
import "../global.css";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthState } from "@/hooks/useAuthState";
import { communityApi, profileApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "@/components/LoadingScreen";

// Suppress SafeAreaView deprecation warning from dependencies
LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);

// Keep splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

// Create QueryClient with optimized defaults for instant loading
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show cached data immediately, refetch in background
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache longer for persistence
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: 2,
    },
  },
});

// Create persister to save cache to AsyncStorage
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "REACT_QUERY_CACHE",
  throttleTime: 1000, // Only persist every 1 second to avoid performance issues
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isLoading, session, isEmailVerified, hasProfile } = useAuthState();

  useEffect(() => {
    if (isLoading) return;

    // Hide splash screen
    SplashScreen.hideAsync();

    const currentRoute = segments.join("/");
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";
    const inTabsGroup = segments[0] === "(tabs)";

    console.log("Auth Guard Check:", {
      hasSession: !!session,
      isEmailVerified,
      hasProfile,
      currentRoute,
    });

    // Determine the expected destination
    if (!session) {
      // Not logged in → should be in auth
      if (!inAuthGroup) {
        router.replace("/(auth)/signup");
      }
    } else if (!isEmailVerified) {
      // Logged in but not verified → should be on verify page
      if (currentRoute !== "(auth)/verify") {
        router.replace({
          pathname: "/(auth)/verify",
          params: { email: session.user.email },
        });
      }
    } else if (!hasProfile && !inTabsGroup) {
      // Verified but no profile → should be on onboarding
      if (!inOnboarding) {
        router.replace("/onboarding");
      }
    } else if (hasProfile) {
      // Fully authenticated → should be in tabs group
      if (inAuthGroup || inOnboarding) {
        router.replace("/(tabs)");
      }
    }
  }, [isLoading, session, isEmailVerified, hasProfile]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

function RealtimeSync() {
  const { session, refresh } = useAuthState();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    console.log("🚀 Initializing LEVEL 3 Zero-Latency Sync Engine");

    const channel = supabase
      .channel("universal-db-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        async (payload) => {
          if (__DEV__) {
            console.log(
              "🔥 RAW REALTIME PAYLOAD:",
              JSON.stringify(payload, null, 2),
            );
          }
          const { table, eventType, new: newRecord, old: oldRecord } = payload;
          const record = newRecord as any;
          const old = oldRecord as any;
          const recordId = record?.id || old?.id;
          const recordUserId = record?.user_id || old?.user_id;

          console.log(`📡 [${table}] ${eventType}`, { recordId, recordUserId });

          // 1. Patch Single Record Caches (Direct access by ID)
          if (eventType === "DELETE") {
            queryClient.removeQueries({ queryKey: [table, recordId] });
            if (table === "creators" && recordUserId) {
              queryClient.removeQueries({ queryKey: [table, recordUserId] });
            }
          } else {
            queryClient.setQueryData([table, recordId], (old: any) =>
              old ? { ...old, ...record } : record,
            );

            // SPECIAL: If table is 'creators', also patch by 'user_id' key
            if (table === "creators" && recordUserId) {
              queryClient.setQueryData([table, recordUserId], (oldData: any) =>
                oldData ? { ...oldData, ...record } : record,
              );

              // ALSO SPECIAL: Patch the flattened "users" profile cache
              queryClient.setQueryData(
                ["users", recordUserId],
                (oldDetails: any) => {
                  if (!oldDetails) return oldDetails;
                  return {
                    ...oldDetails,
                    bio: record.bio,
                    verification_status: record.verification_status,
                  };
                },
              );
            }
          }

          // 2. Patch Collection Caches (Infinite Lists / Feeds)
          queryClient.setQueriesData({ queryKey: [table] }, (oldData: any) => {
            if (!oldData) return oldData;
            // Handle Infinite Data structure
            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: any, index: number) => ({
                  ...page,
                  data:
                    eventType === "INSERT"
                      ? index === 0
                        ? [record, ...(page.data || [])]
                        : page.data
                      : eventType === "DELETE"
                        ? page.data?.filter((item: any) => item.id !== recordId)
                        : page.data?.map((item: any) =>
                            item.id === recordId
                              ? { ...item, ...record }
                              : item,
                          ),
                })),
              };
            }

            // Handle Simple Array structure
            if (Array.isArray(oldData)) {
              if (eventType === "INSERT") return [record, ...oldData];
              if (eventType === "DELETE")
                return oldData.filter((item: any) => item.id !== recordId);
              return oldData.map((item: any) =>
                item.id === recordId ? { ...item, ...record } : item,
              );
            }

            return oldData;
          });

          // 3. Specialized Auth State Synchronization
          if (
            (table === "users" && recordId === userId) ||
            (table === "creators" && recordUserId === userId)
          ) {
            console.log("👤 Patching Auth State...");
            await refresh();
          }

          // 4. Force invalidation for relations (Safety Net)
          queryClient.invalidateQueries({
            queryKey: [table],
            exact: false,
          });
        },
      )
      .subscribe();

    // 5. Global Notification Listener for Messages
    const notificationChannel = supabase
      .channel(`notifications:${userId}`)
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        console.log("🔔 [Global] New Message Notification!", payload);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        if (payload.conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["messages", payload.conversationId],
          });
        }
      })
      .on("broadcast", { event: "read_notification" }, ({ payload }) => {
        console.log("👀 [Global] Messages Read Notification!", payload);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        if (payload.conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["messages", payload.conversationId],
          });
        }
      })
      .subscribe();

    return () => {
      console.log("🔌 Stopping Level 3 Sync Engine");
      supabase.removeChannel(channel);
      supabase.removeChannel(notificationChannel);
    };
  }, [userId, refresh, queryClient]);

  return null;
}

import { AuthProvider } from "@/context/AuthContext";
import { PresenceProvider } from "@/context/PresenceContext";

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <AuthProvider>
        <AuthGuard>
          <RealtimeSync />
          <PresenceProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </PresenceProvider>
        </AuthGuard>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
