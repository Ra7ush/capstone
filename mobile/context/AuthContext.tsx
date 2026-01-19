import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthState, VerificationStatus } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { communityApi } from "@/lib/api";

const PENDING_EMAIL_KEY = "@pending_verification_email";

type AuthContextType = AuthState & {
  setPendingEmail: (email: string) => Promise<void>;
  clearPendingEmail: () => Promise<void>;
  refresh: () => Promise<void>;
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

      const pendingEmail = await AsyncStorage.getItem(PENDING_EMAIL_KEY);
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

      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();
      const user = freshUser || session.user;
      const isEmailVerified = !!user.email_confirmed_at;
      let hasProfile = false;
      let userProfile = null;
      let verification_status: VerificationStatus = "none";
      let creatorCommunityId: string | null = null;

      if (isEmailVerified) {
        const { data: profile } = await supabase
          .from("users")
          .select("*, creators(verification_status, bio)")
          .eq("id", user.id)
          .single();

        if (profile) {
          hasProfile = true;
          userProfile = {
            ...profile,
            bio: profile.creators?.bio,
            verification_status: profile.creators?.verification_status,
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
        await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
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
        },
      });
    } catch (error) {
      console.error("Auth context check error:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    } finally {
      isCheckingAuth.current = false;
    }
  }, []);

  useEffect(() => {
    checkAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      console.log("Auth Provider Event:", event);
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
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
    await AsyncStorage.setItem(PENDING_EMAIL_KEY, email);
    setState((prev) => ({ ...prev, pendingEmail: email }));
  };

  const clearPendingEmail = async () => {
    await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
    setState((prev) => ({ ...prev, pendingEmail: null }));
  };

  const value = {
    ...state,
    setPendingEmail,
    clearPendingEmail,
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
