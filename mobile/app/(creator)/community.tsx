import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import { useJoinedCommunities, useCommunity } from "../../hooks/useCommunity";
import { useAuthState } from "../../hooks/useAuthState";
import { CreatorOnboarding } from "../../components/community/CreatorOnboarding";
import { CommunityDashboard } from "../../components/community/CommunityDashboard";
import { Community as CommunityType } from "../../hooks/useCommunity";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export default function Community() {
  const [selectedCommunity, setSelectedCommunity] =
    useState<CommunityType | null>(null);

  const {
    session,
    user: authUser,
    refresh: refreshAuth,
    isLoading: isAuthLoading,
  } = useAuthState();

  const { data: joinedData, isLoading: isLoadingJoined } =
    useJoinedCommunities();
  const { createCommunity, uploadImage } = useCommunity();

  const userProfile = authUser?.profile;
  const currentUserId = session?.user?.id;
  const joinedCommunities = joinedData?.data || [];

  // Check if user is a creator
  const isCreator = userProfile?.role === "creator";

  // Use creatorCommunityId from global AuthContext for instant decision
  const hasCreatorCommunity = !!authUser?.creatorCommunityId;

  // Auto-select creator's own community if they have one
  useEffect(() => {
    // If they have a community ID but we don't have the full object yet,
    // we'll wait for the joined communities to settle (which are prefetched in background)
    const creatorOwnCommunityFromJoined = joinedCommunities.find(
      (item) => item.community?.creator_id === currentUserId
    )?.community;

    if (isCreator && hasCreatorCommunity && !selectedCommunity) {
      if (creatorOwnCommunityFromJoined) {
        setSelectedCommunity(creatorOwnCommunityFromJoined as CommunityType);
      }
    }
  }, [
    isCreator,
    hasCreatorCommunity,
    joinedCommunities,
    selectedCommunity,
    currentUserId,
  ]);

  // Loading state - Fast path: Just wait for auth and profile
  const isUserDataReady = !isAuthLoading && userProfile !== null;

  // Onboarding condition - Instant decision based on global auth state
  const needsToCreateCommunity =
    isUserDataReady && isCreator && !hasCreatorCommunity && !selectedCommunity;

  if (!isUserDataReady) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {needsToCreateCommunity ? (
        <CreatorOnboarding
          onCreate={createCommunity}
          uploadImage={uploadImage}
          onSuccess={(newCommunity) => {
            setSelectedCommunity(newCommunity);
            refreshAuth();
          }}
        />
      ) : (
        <CommunityDashboard
          currentUserId={currentUserId}
          user={authUser}
          joinedCommunities={joinedCommunities}
          isLoadingJoined={isLoadingJoined}
          refreshAuth={refreshAuth}
          initialCommunity={selectedCommunity}
          isCreator={isCreator}
          hasCreatorCommunity={hasCreatorCommunity}
        />
      )}
    </View>
  );
}
