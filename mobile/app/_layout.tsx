import { useEffect, useRef } from "react";
import { LogBox } from "react-native";
import { Stack, useRouter, useSegments, SplashScreen } from "expo-router";
import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthState } from "@/hooks/useAuthState";
import LoadingScreen from "@/components/LoadingScreen";

// Suppress SafeAreaView deprecation warning from dependencies
LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);

// Keep splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isLoading, session, isEmailVerified, hasProfile } = useAuthState();
  const initialCheckDone = useRef(false);

  useEffect(() => {
    // Only run once per auth state change, not on every render
    if (isLoading) {
      initialCheckDone.current = false;
      return;
    }

    // Skip if we've already done the initial check for this auth state
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;

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
      // Verified but no profile → should be on onboarding (unless navigating to tabs after completion)
      if (!inOnboarding) {
        router.replace("/onboarding");
      }
    } else if (hasProfile) {
      // Fully authenticated → should be in tabs group
      if (inAuthGroup || inOnboarding) {
        router.replace("/(tabs)");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session, isEmailVerified, hasProfile]);

  // Reset the check when segments change (user navigated)
  useEffect(() => {
    // Allow re-check if user manually navigates
  }, [segments]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGuard>
    </QueryClientProvider>
  );
}
