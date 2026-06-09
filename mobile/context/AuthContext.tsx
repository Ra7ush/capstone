import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";
import { mmkvStorageAsync } from "@/lib/storage";
import type { AuthState, VerificationStatus } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { communityApi } from "@/lib/api";
import { clearAllMessageCaches } from "@/lib/messageCache";
import * as Linking from "expo-linking";
import { router as expoRouter } from "expo-router";

const PENDING_EMAIL_KEY = "@pending_verification_email";

type AuthContextType = AuthState & {
  setPendingEmail: (email: string) => Promise<void>;
  clearPendingEmail: () => Promise<void>;
  refresh: () => Promise<void>;
  verifyMFA: (code: string) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    session: null,
    isEmailVerified: false,
    hasProfile: false,
    pendingEmail: null,
    user: null,
  });

  const isCheckingAuth = useRef(false);

  const checkAuthState = useCallback(async (forceLoading = true) => {
    if (isCheckingAuth.current) return;
    isCheckingAuth.current = true;

    try {
      if (forceLoading) {
        setState((prev) => ({ ...prev, isLoading: true }));
      }

      const pendingEmail = await mmkvStorageAsync.getItem(PENDING_EMAIL_KEY);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();

      const { data: mfaData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const aal = mfaData?.currentLevel as "aal1" | "aal2" | undefined;

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

      const user = freshUser || session.user;
      const isEmailVerified = !!user.email_confirmed_at;
      let hasProfile = false;
      let userProfile = null;
      let verification_status: VerificationStatus = "none";
      let creatorCommunityId: string | null = null;

      if (isEmailVerified) {
        const { data: profile } = await supabase
          .from("users")
          .select(
            "*, creators(verification_status, bio, social_links, portfolio_url)",
          )
          .eq("id", user.id)
          .single();

        if (profile) {
          hasProfile = true;
          userProfile = {
            ...profile,
            bio: profile.creators?.bio,
            verification_status: profile.creators?.verification_status,
            social_links: profile.creators?.social_links,
            portfolio_url: profile.creators?.portfolio_url,
          };
          if (profile.role === "creator" && profile.creators) {
            verification_status = profile.creators.verification_status;
          }

          if (profile.role === "creator") {
            const { data: communities } = await supabase
              .from("communities")
              .select("id")
              .eq("creator_id", user.id)
              .limit(1);

            creatorCommunityId = communities?.[0]?.id || null;
          }
        }
      }

      if (isEmailVerified && pendingEmail) {
        await mmkvStorageAsync.removeItem(PENDING_EMAIL_KEY);
      }

      setState({
        isLoading: false,
        session,
        isEmailVerified,
        hasProfile,
        pendingEmail: isEmailVerified ? null : pendingEmail,
        user: {
          ...user,
          profile: userProfile,
          verification_status,
          creatorCommunityId,
          mfa_enabled: !!mfaData?.nextLevel && mfaData.nextLevel === "aal2",
        },
        aal,
      });
    } catch (error) {
      console.error("Auth context check error:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    } finally {
      isCheckingAuth.current = false;
    }
  }, []);

  const handleDeepLink = async (url: string | null) => {
    if (!url) return;

    // Supabase auth callback URL parsing
    if (url.includes("access_token") || url.includes("refresh_token")) {
      // Try extracting from hash (Supabase default) or search params
      const fragment = url.split("#")[1] || url.split("?")[1];
      if (!fragment) return;

      const params = new URLSearchParams(fragment);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const type = params.get("type");

      if (access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        // If this is a password recovery link, navigate to reset password screen
        if (type === "recovery") {
          setTimeout(() => {
            expoRouter.replace("/(auth)/reset-password");
          }, 300);
        }
      }
    }
  };

  useEffect(() => {
    // Check initial URL
    Linking.getInitialURL().then(handleDeepLink);

    // Listen for incoming links
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    checkAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      console.log("Auth Provider Event:", event);
      if (event === "PASSWORD_RECOVERY") {
        // User clicked the password reset link from email — navigate to reset screen
        setTimeout(() => {
          expoRouter.replace("/(auth)/reset-password");
        }, 300);
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED"
      ) {
        await checkAuthState(false); // Don't trigger full loading UI for background refreshes
      } else if (event === "SIGNED_OUT") {
        setState({
          isLoading: false,
          session: null,
          isEmailVerified: false,
          hasProfile: false,
          pendingEmail: null,
          user: null,
        });
        queryClient.clear();
        clearAllMessageCaches();
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuthState, queryClient]);

  // Prefetch community data when profile is ready
  useEffect(() => {
    if (state.hasProfile && state.user && !state.isLoading) {
      queryClient.prefetchQuery({
        queryKey: ["communities", "joined"],
        queryFn: communityApi.getJoinedCommunities,
      });

      queryClient.prefetchQuery({
        queryKey: ["communities", "discover", undefined],
        queryFn: () => communityApi.getDiscoverCommunities(),
      });

      // Aggressively prefetch the main feed
      queryClient.prefetchInfiniteQuery({
        queryKey: ["posts", undefined],
        queryFn: ({ pageParam = 1 }) =>
          communityApi.getFeed({ page: pageParam as number, limit: 15 }),
        initialPageParam: 1,
      });

      // If creator, prefetch their specific community feed immediately
      if (state.user.creatorCommunityId) {
        queryClient.prefetchInfiniteQuery({
          queryKey: ["posts", state.user.creatorCommunityId],
          queryFn: ({ pageParam = 1 }) =>
            communityApi.getFeed({
              page: pageParam as number,
              limit: 15,
              community_id: state.user.creatorCommunityId as string,
            }),
          initialPageParam: 1,
        });

        queryClient.prefetchQuery({
          queryKey: ["communities", "detail", state.user.creatorCommunityId],
          queryFn: () =>
            communityApi.getCommunityById(
              state.user.creatorCommunityId as string,
            ),
        });
      }
    }
  }, [state.hasProfile, !!state.user, state.isLoading, queryClient]);

  const setPendingEmail = async (email: string) => {
    await mmkvStorageAsync.setItem(PENDING_EMAIL_KEY, email);
    setState((prev) => ({ ...prev, pendingEmail: email }));
  };

  const clearPendingEmail = async () => {
    await mmkvStorageAsync.removeItem(PENDING_EMAIL_KEY);
    setState((prev) => ({ ...prev, pendingEmail: null }));
  };

  const verifyMFA = async (code: string) => {
    const { data: factors, error: factorsError } =
      await supabase.auth.mfa.listFactors();
    if (factorsError || !factors?.totp[0])
      return { error: factorsError || { message: "No MFA factor found" } };

    const totpFactor = factors.totp[0];

    const { data: challenge } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id,
    });

    if (challenge) {
      const result = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });
      if (!result.error) await checkAuthState(false);
      return result;
    }
    return { error: { message: "Failed to create challenge" } };
  };

  const value = {
    ...state,
    setPendingEmail,
    clearPendingEmail,
    verifyMFA,
    refresh: () => checkAuthState(false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
