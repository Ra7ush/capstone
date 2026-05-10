import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Share,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useCreatorProfile } from "@/hooks/useProfile";
import { useAllServices, usePurchasedServiceIds } from "@/hooks/useServices";
import { useStartConversation } from "@/hooks/useMessaging";
import { useAuth } from "@/context/AuthContext";
import {
  useCreatorRatings,
  useMyCreatorRating,
  useCreateCreatorRating,
} from "@/hooks/useReviews";
import { ReviewForm, ReviewItem, StarRating } from "@/components";
import { useState } from "react";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

/**
 * Public Creator Profile Screen
 *
 * Features:
 * - Creator hero with profile/cover imagery
 * - Growth/Impact stats
 * - Social connections
 * - Course portfolio listing
 */
export default function CreatorProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: creator, isLoading: isLoadingProfile } = useCreatorProfile(id!);
  const { data: services, isLoading: isLoadingServices } = useAllServices(
    undefined,
    undefined,
    id,
  );
  const { data: purchasedIds = [] } = usePurchasedServiceIds();
  const startConversation = useStartConversation();

  // Rating hooks
  const {
    data: ratingsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCreatorRatings(id);
  const { data: myRating } = useMyCreatorRating(id);
  const createRating = useCreateCreatorRating();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const allRatings = ratingsData?.pages.flatMap((page) => page.data) || [];

  const handleInitiateContact = async () => {
    if (!id) return;
    try {
      const conversation = await startConversation.mutateAsync(id);
      if (conversation?.conversationId) {
        // Navigate to the message tab first so it's in the background
        router.navigate("/(user)/message");

        // Small delay to ensure the tab switch is processed before pushing the chat room
        setTimeout(() => {
          router.push({
            pathname: "/chat/[id]",
            params: { id: conversation.conversationId },
          });
        }, 100);
      }
    } catch (error) {
      console.error("Error initiating contact:", error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${creator?.user?.username || "this creator"} on Nexus Protocol!`,
        url: `https://nexus-protocol.app/creator/${id}`,
      });
    } catch (error) {
      console.error("Error sharing profile:", error);
    }
  };

  const isLoading = isLoadingProfile || isLoadingServices;

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#000" />
        <Text className="text-gray-400 font-bold mt-4">
          Syncing protocol data...
        </Text>
      </View>
    );
  }

  if (!creator) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
        <Text className="text-gray-400 font-bold mt-4">Creator not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-black font-bold">Return to safety</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const socialLinks = creator.social_links || {};
  const hasSocials = Object.values(socialLinks).some((link) => !!link);

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "",
          headerShown: true,
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-sm"
            >
              <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleShare}
              className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-sm"
            >
              <Ionicons name="share-outline" size={22} color="black" />
            </TouchableOpacity>
          ),
        }}
      />
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header / Brand Profile */}
        <View className="bg-black pt-24 pb-12 px-6">
          <Animated.View
            entering={FadeIn}
            className="flex-row items-center gap-5"
          >
            <View className="w-24 h-24 rounded-full bg-[#FF4D00] items-center justify-center border-4 border-white/20">
              {creator.user?.profile_image_url ? (
                <Image
                  source={{ uri: creator.user.profile_image_url }}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <Text className="text-white text-4xl font-black italic">
                  {creator.user?.username?.[0]?.toUpperCase() || "B"}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-white text-3xl font-black italic tracking-tighter">
                  {creator.user?.full_name ||
                    creator.user?.username ||
                    "Architect"}
                </Text>
                {creator.verification_status === "verified" && (
                  <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
                )}
              </View>
              <Text className="text-gray-400 font-bold">
                @{creator.user?.username || "user"}
              </Text>

              <View className="flex-row items-center mt-3 gap-3">
                <View className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <Text className="text-white text-[10px] font-black uppercase tracking-widest">
                    Creator
                  </Text>
                </View>
                <Text className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                  ID: {id?.slice(0, 8)?.toUpperCase()}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Dynamic Stats Row */}
          <Animated.View
            entering={FadeInUp.delay(200)}
            className="flex-row bg-white/5 rounded-3xl p-5 border border-white/10 mt-8"
          >
            <View className="flex-1 items-center border-r border-white/10">
              <Text className="text-white font-black text-xl italic">
                {services?.length || 0}
              </Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-tighter mt-1">
                Protocols
              </Text>
            </View>
            <View className="flex-1 items-center border-r border-white/10">
              <Text className="text-white font-black text-xl italic">
                {creator.average_rating > 0
                  ? creator.average_rating.toFixed(1)
                  : "0.0"}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={10} color="#FBBF24" />
                <Text className="text-gray-500 text-[10px] font-black uppercase tracking-tighter ml-1">
                  Rating
                </Text>
              </View>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-white font-black text-xl italic">
                {creator.total_ratings || 0}
              </Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-tighter mt-1">
                Reviews
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Content Body */}
        <View className="px-6 py-8">
          {/* About Section */}
          <View className="mb-10">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Intelligence Directive
            </Text>
            <View className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
              <Text className="text-gray-600 leading-6 font-medium">
                {creator.bio ||
                  "No intelligence directive provided for this architect. Specializing in Nexus Protocol implementations and system design."}
              </Text>

              {hasSocials && (
                <View className="flex-row items-center gap-4 mt-6">
                  {socialLinks.github && (
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-black items-center justify-center">
                      <Ionicons name="logo-github" size={20} color="white" />
                    </TouchableOpacity>
                  )}
                  {socialLinks.instagram && (
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-pink-500 items-center justify-center">
                      <Ionicons name="logo-instagram" size={20} color="white" />
                    </TouchableOpacity>
                  )}
                  {socialLinks.linkedin && (
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center">
                      <Ionicons name="logo-linkedin" size={20} color="white" />
                    </TouchableOpacity>
                  )}
                  {creator.portfolio_url && (
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
                      <Ionicons name="globe-outline" size={20} color="black" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Portfolio Grid */}
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Published Artifacts
              </Text>
              <Text className="text-[10px] font-black text-[#FF4D00] uppercase">
                {services?.length || 0} Total
              </Text>
            </View>

            {services && services.length > 0 ? (
              <View className="flex-row flex-wrap gap-3">
                {services.map((svc) => (
                  <TouchableOpacity
                    key={svc.id}
                    onPress={() =>
                      router.push({
                        pathname: purchasedIds.includes(svc.id)
                          ? "/course-learn"
                          : "/service-detail",
                        params: { id: svc.id },
                      })
                    }
                    className="w-[48%] bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm mb-2"
                  >
                    <View className="w-full h-32 bg-gray-100">
                      {svc.thumbnail_url ? (
                        <Image
                          source={{ uri: svc.thumbnail_url }}
                          className="w-full h-full"
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center">
                          <Ionicons
                            name="document-text-outline"
                            size={32}
                            color="#D1D5DB"
                          />
                        </View>
                      )}
                      <View className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded-full">
                        <Text className="text-white text-[8px] font-black uppercase">
                          {svc.category || "General"}
                        </Text>
                      </View>
                    </View>
                    <View className="p-3">
                      <Text
                        className="text-black font-black text-xs leading-4 mb-2"
                        numberOfLines={2}
                      >
                        {svc.title}
                      </Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[#FF4D00] font-black text-[10px]">
                          {svc.price ? `$${svc.price}` : "Free"}
                        </Text>
                        {svc.total_reviews > 0 && (
                          <View className="flex-row items-center">
                            <Ionicons name="star" size={8} color="#FBBF24" />
                            <Text className="text-gray-400 font-bold text-[8px] ml-0.5">
                              {svc.average_rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="bg-gray-50 rounded-3xl p-12 items-center justify-center border border-dashed border-gray-200">
                <Ionicons
                  name="folder-open-outline"
                  size={40}
                  color="#D1D5DB"
                />
                <Text className="text-gray-400 font-bold mt-3 text-center">
                  No published artifacts in this repository yet.
                </Text>
              </View>
            )}
          </View>

          {/* Instructor Reviews Section */}
          <View className="mt-12">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Instructor Reviews
            </Text>

            {/* Write a Review Form */}
            {id !== session?.user?.id && (
              <View className="mb-8">
                {!showReviewForm && !myRating ? (
                  <TouchableOpacity
                    onPress={() => setShowReviewForm(true)}
                    className="bg-black py-4 rounded-3xl items-center flex-row justify-center border border-white/10"
                  >
                    <Ionicons name="star-outline" size={18} color="#fff" />
                    <Text className="text-white font-black text-[10px] uppercase tracking-widest ml-2">
                      Rate Instructor
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <Text className="text-black font-black text-xs mb-4 uppercase italic">
                      {myRating ? "Update Your Feedback" : "System Feedback"}
                    </Text>
                    <ReviewForm
                      existingReview={myRating}
                      onSubmit={(data) => {
                        createRating.mutate({
                          creator_id: id!,
                          rating: data.rating,
                          review: data.review_text,
                        });
                        setShowReviewForm(false);
                      }}
                      isSubmitting={createRating.isPending}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Ratings List */}
            {allRatings.length > 0 ? (
              <View>
                {allRatings.map((rating: any) => (
                  <ReviewItem
                    key={rating.id}
                    review={{
                      ...rating,
                      review_text: rating.review, // Map field name differences
                    }}
                    currentUserId={session?.user?.id}
                  />
                ))}

                {hasNextPage && (
                  <TouchableOpacity
                    onPress={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="py-6 items-center"
                  >
                    {isFetchingNextPage ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text className="text-black font-black text-[10px] uppercase tracking-widest">
                        Access More Logs
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="items-center py-10 bg-gray-50 rounded-3xl border border-gray-100">
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={32}
                  color="#D1D5DB"
                />
                <Text className="text-gray-400 font-bold mt-3 text-xs">
                  No public feedback logs yet.
                </Text>
              </View>
            )}
          </View>

          <Text className="text-center text-gray-300 text-[10px] font-black uppercase tracking-widest mt-16 mb-8">
            Nexus Protocol Architect Database • v1.0.42
          </Text>
        </View>
      </ScrollView>

      {/* Primary Action Button */}
      <View className="absolute bottom-6 left-6 right-6">
        <TouchableOpacity
          onPress={handleInitiateContact}
          disabled={startConversation.isPending}
          className="bg-black py-4 rounded-full items-center shadow-xl flex-row justify-center"
        >
          {startConversation.isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="mail-outline" size={18} color="white" />
              <Text className="text-white font-black uppercase tracking-widest ml-2">
                Initiate Contact
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
