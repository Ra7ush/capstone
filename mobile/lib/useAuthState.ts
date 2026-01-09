import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AuthState = {
  isLoading: boolean;
  session: any | null;
  isEmailVerified: boolean;
  hasProfile: boolean;
  pendingEmail: string | null;
  user: any | null;
};

const PENDING_EMAIL_KEY = "@pending_verification_email";

export function useAuthState() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    session: null,
    isEmailVerified: false,
    hasProfile: false,
    pendingEmail: null,
    user: null,
  });

  useEffect(() => {
    checkAuthState();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await checkAuthState();
      } else if (event === "SIGNED_OUT") {
        setState({
          isLoading: false,
          session: null,
          isEmailVerified: false,
          hasProfile: false,
          pendingEmail: null,
          user: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthState = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // 1. Check for pending email (user started signup but didn't verify)
      const pendingEmail = await AsyncStorage.getItem(PENDING_EMAIL_KEY);

      // 2. Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setState({
          isLoading: false,
          session: null,
          isEmailVerified: false,
          hasProfile: false,
          pendingEmail,
          user: null,
        });
        return;
      }

      const user = session.user;

      // 3. Check if email is verified
      // Supabase sets email_confirmed_at when email is verified
      const isEmailVerified = !!user.email_confirmed_at;

      // 4. Check if user has completed onboarding (has profile in users table)
      let hasProfile = false;
      if (isEmailVerified) {
        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();

        hasProfile = !!profile;
      }

      // Clear pending email if verified
      if (isEmailVerified && pendingEmail) {
        await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
      }

      setState({
        isLoading: false,
        session,
        isEmailVerified,
        hasProfile,
        pendingEmail: isEmailVerified ? null : pendingEmail,
        user,
      });
    } catch (error) {
      console.error("Auth state check error:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Helper to save pending email when user signs up
  const setPendingEmail = async (email: string) => {
    await AsyncStorage.setItem(PENDING_EMAIL_KEY, email);
    setState((prev) => ({ ...prev, pendingEmail: email }));
  };

  // Helper to clear pending email
  const clearPendingEmail = async () => {
    await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
    setState((prev) => ({ ...prev, pendingEmail: null }));
  };

  // Refresh auth state manually
  const refresh = () => checkAuthState();

  return {
    ...state,
    setPendingEmail,
    clearPendingEmail,
    refresh,
  };
}
