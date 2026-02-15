import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  useService,
  usePurchasedServiceIds,
  usePurchaseService,
} from "@/hooks/useServices";
import {
  useServiceReviews,
  useReviewStats,
  useMyReview,
  useCreateReview,
  useDeleteReview,
} from "@/hooks/useReviews";
import { useAuth } from "@/context/AuthContext";
import {
  StarRating,
  ReviewItem,
  ReviewSummary,
  ReviewForm,
} from "@/components";
import type { CourseModule, Review } from "@/types";

/**
 * Service Detail Screen - View course details and purchase
 *
 * Features:
 * - Full course information
 * - Creator profile section
 * - Curriculum preview (modules/lessons)
 * - Fake payment flow
 */
export default function ServiceDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: service, isLoading } = useService(id);
  const { data: purchasedIds = [] } = usePurchasedServiceIds();
  const purchaseService = usePurchaseService();

  // Review hooks
  const { data: reviewStats } = useReviewStats(id);
  const { data: myReview } = useMyReview(id);
  const {
    data: reviewsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useServiceReviews(id);
  const createReview = useCreateReview();
  const deleteReview = useDeleteReview(id || "");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );

  const isPurchased = purchasedIds.includes(id || "");
  const currentUserId = session?.user?.id;
  const allReviews = reviewsData?.pages.flatMap((page) => page.data) || [];

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined || price === 0) return "Free";
    return `$${price.toFixed(2)}`;
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handlePurchase = async () => {
    if (!id || !service) return;
    try {
      await purchaseService.mutateAsync({
        serviceId: id,
        price: service.price || 0,
      });
      setPurchaseSuccess(true);
    } catch (error) {
      console.error("Purchase failed:", error);
      Alert.alert("Purchase Failed", "Something went wrong. Please try again.");
    }
  };

  const handleCloseSuccess = () => {
    setPurchaseSuccess(false);
    setShowPaymentModal(false);
  };

  const getTotalLessons = () => {
    if (!service?.modules) return 0;
    return service.modules.reduce(
      (total: number, module: CourseModule) =>
        total + (module.lessons?.length || 0),
      0,
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#000" />
        <Text className="text-gray-400 font-bold mt-4">Loading course...</Text>
      </View>
    );
  }

  if (!service) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
        <Text className="text-gray-400 font-bold mt-4">Course not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-black font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        }}
      />
      <StatusBar style="light" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View className="w-full h-64 bg-gray-100">
          {service.thumbnail_url ? (
            <Image
              source={{ uri: service.thumbnail_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-100">
              <Ionicons name="school-outline" size={64} color="#D1D5DB" />
            </View>
          )}
          {/* Overlay gradient */}
          <View className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
        </View>

        {/* Content */}
        <View className="px-6 py-6 -mt-6 bg-white rounded-t-3xl">
          {/* Category & Status */}
          <View className="flex-row items-center mb-3">
            {service.category && (
              <View className="bg-gray-100 px-3 py-1 rounded-full mr-2">
                <Text className="text-gray-600 text-xs font-bold">
                  {service.category}
                </Text>
              </View>
            )}
            {isPurchased && (
              <View className="bg-green-100 px-3 py-1 rounded-full flex-row items-center">
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text className="text-green-600 text-xs font-bold ml-1">
                  Purchased
                </Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text className="text-2xl font-black text-black mb-2">
            {service.title}
          </Text>

          {/* Rating Badge */}
          {service.total_reviews > 0 && (
            <View className="flex-row items-center mb-3">
              <StarRating rating={service.average_rating} size={14} />
              <Text className="text-amber-500 font-black text-sm ml-1.5">
                {service.average_rating.toFixed(1)}
              </Text>
              <Text className="text-gray-400 text-xs ml-1">
                ({service.total_reviews}{" "}
                {service.total_reviews === 1 ? "review" : "reviews"})
              </Text>
            </View>
          )}

          {/* Price */}
          <Text className="text-3xl font-black text-black mb-6">
            {formatPrice(service.price)}
          </Text>

          {/* Creator Card */}
          <TouchableOpacity
            className="bg-gray-50 p-4 rounded-2xl flex-row items-center mb-6"
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/creator/[id]",
                params: { id: service.creator_id },
              })
            }
          >
            {service.creator?.profile_image_url ? (
              <Image
                source={{ uri: service.creator.profile_image_url }}
                className="w-14 h-14 rounded-full"
              />
            ) : (
              <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center">
                <Ionicons name="person" size={24} color="#9CA3AF" />
              </View>
            )}
            <View className="flex-1 ml-4">
              <Text className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                Instructor
              </Text>
              <Text className="text-black font-black text-lg">
                {service.creator?.username || "Creator"}
              </Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-white items-center justify-center">
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Stats */}
          <View className="flex-row mb-6">
            <View className="flex-1 bg-gray-50 p-4 rounded-2xl mr-2 items-center">
              <Ionicons name="layers-outline" size={24} color="#000" />
              <Text className="text-xl font-black text-black mt-1">
                {service.modules?.length || 0}
              </Text>
              <Text className="text-gray-400 text-xs font-bold">Modules</Text>
            </View>
            <View className="flex-1 bg-gray-50 p-4 rounded-2xl ml-2 items-center">
              <Ionicons name="play-circle-outline" size={24} color="#000" />
              <Text className="text-xl font-black text-black mt-1">
                {getTotalLessons()}
              </Text>
              <Text className="text-gray-400 text-xs font-bold">Lessons</Text>
            </View>
          </View>

          {/* Description */}
          {service.description && (
            <View className="mb-6">
              <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                About This Course
              </Text>
              <Text className="text-gray-600 leading-6">
                {service.description}
              </Text>
            </View>
          )}

          {/* Curriculum */}
          {service.modules && service.modules.length > 0 && (
            <View className="mb-6">
              <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                Curriculum
              </Text>

              {isPurchased ? (
                /* Purchased — show only the Go to Course Content button */
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/course-learn",
                      params: { id: service.id },
                    } as any)
                  }
                  className="bg-black py-4 rounded-2xl items-center flex-row justify-center"
                >
                  <Ionicons name="play-circle" size={18} color="white" />
                  <Text className="text-white font-black text-sm ml-2">
                    Go to Course Content
                  </Text>
                </TouchableOpacity>
              ) : (
                /* Not purchased — show curriculum preview */
                <>
                  {service.modules.map(
                    (module: CourseModule, index: number) => (
                      <View
                        key={module.id}
                        className="bg-gray-50 rounded-2xl mb-3 overflow-hidden"
                      >
                        <TouchableOpacity
                          onPress={() => toggleModule(module.id)}
                          className="flex-row items-center p-4"
                        >
                          <View className="w-8 h-8 rounded-full bg-black items-center justify-center mr-3">
                            <Text className="text-white font-black text-sm">
                              {index + 1}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text
                              className="font-black text-black"
                              numberOfLines={1}
                            >
                              {module.title}
                            </Text>
                            <Text className="text-gray-400 text-xs font-bold">
                              {module.lessons?.length || 0} lessons
                            </Text>
                          </View>
                          <Ionicons
                            name={
                              expandedModules.has(module.id)
                                ? "chevron-up"
                                : "chevron-down"
                            }
                            size={20}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>

                        {/* Lessons */}
                        {expandedModules.has(module.id) && module.lessons && (
                          <View className="px-4 pb-4">
                            {module.lessons.map((lesson, lessonIndex) => (
                              <View
                                key={lesson.id}
                                className="flex-row items-center bg-white p-3 rounded-xl mb-2"
                              >
                                <Text className="text-gray-400 font-bold mr-3 w-6">
                                  {lessonIndex + 1}
                                </Text>
                                <View className="flex-1">
                                  <Text
                                    className="font-bold text-black"
                                    numberOfLines={1}
                                  >
                                    {lesson.title}
                                  </Text>
                                  {lesson.is_preview && (
                                    <View className="bg-blue-100 px-2 py-0.5 rounded self-start mt-1">
                                      <Text className="text-blue-600 text-[10px] font-bold">
                                        Preview
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                {!lesson.is_preview && (
                                  <Ionicons
                                    name="lock-closed"
                                    size={14}
                                    color="#D1D5DB"
                                  />
                                )}
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ),
                  )}
                </>
              )}
            </View>
          )}

          {/* Reviews Section */}
          <View className={isPurchased ? "mb-6" : "mb-24"}>
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Reviews
            </Text>

            {/* Review Summary (Udemy-style) */}
            {reviewStats && reviewStats.total > 0 && (
              <View className="mb-6">
                <ReviewSummary stats={reviewStats} />
              </View>
            )}

            {/* Write Review (only for purchased users) */}
            {isPurchased && (
              <View className="mb-6">
                {!showReviewForm && !myReview ? (
                  <TouchableOpacity
                    onPress={() => setShowReviewForm(true)}
                    className="bg-black py-4 rounded-2xl items-center flex-row justify-center"
                  >
                    <Ionicons name="star-outline" size={18} color="#fff" />
                    <Text className="text-white font-black text-sm ml-2">
                      Write a Review
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <ReviewForm
                    existingReview={myReview}
                    onSubmit={(data) => {
                      if (!id) return;
                      createReview.mutate(
                        { service_id: id, ...data },
                        {
                          onSuccess: () => setShowReviewForm(false),
                        },
                      );
                    }}
                    onDelete={
                      myReview
                        ? () => {
                            deleteReview.mutate(myReview.id, {
                              onSuccess: () => setShowReviewForm(false),
                            });
                          }
                        : undefined
                    }
                    isSubmitting={createReview.isPending}
                    isDeleting={deleteReview.isPending}
                  />
                )}
              </View>
            )}

            {/* Reviews List */}
            {allReviews.length > 0 ? (
              <View>
                {allReviews.map((review: Review) => (
                  <ReviewItem
                    key={review.id}
                    review={review}
                    currentUserId={currentUserId}
                  />
                ))}

                {/* Load More */}
                {hasNextPage && (
                  <TouchableOpacity
                    onPress={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="py-4 items-center"
                  >
                    {isFetchingNextPage ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text className="text-black font-bold text-sm">
                        Load More Reviews
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="items-center py-8">
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={40}
                  color="#D1D5DB"
                />
                <Text className="text-gray-400 font-bold mt-3">
                  No reviews yet
                </Text>
                <Text className="text-gray-300 text-xs mt-1">
                  Be the first to review this course
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      {!isPurchased && (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100">
          <TouchableOpacity
            onPress={() => setShowPaymentModal(true)}
            className="bg-black py-4 rounded-2xl items-center"
          >
            <Text className="text-white font-black text-base">
              {service.price && service.price > 0
                ? `Enroll Now - ${formatPrice(service.price)}`
                : "Enroll for Free"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() =>
          !purchaseService.isPending && setShowPaymentModal(false)
        }
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            {!purchaseSuccess ? (
              <>
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-xl font-black text-black">
                    Confirm Purchase
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPaymentModal(false)}
                    disabled={purchaseService.isPending}
                  >
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Order Summary */}
                <View className="bg-gray-50 p-4 rounded-2xl mb-6">
                  <View className="flex-row items-center">
                    {service.thumbnail_url ? (
                      <Image
                        source={{ uri: service.thumbnail_url }}
                        className="w-16 h-16 rounded-xl"
                      />
                    ) : (
                      <View className="w-16 h-16 rounded-xl bg-gray-200 items-center justify-center">
                        <Ionicons
                          name="school-outline"
                          size={24}
                          color="#9CA3AF"
                        />
                      </View>
                    )}
                    <View className="flex-1 ml-4">
                      <Text className="font-black text-black" numberOfLines={2}>
                        {service.title}
                      </Text>
                      <Text className="text-gray-400 text-sm">
                        by {service.creator?.username || "Creator"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Price Breakdown */}
                <View className="mb-6">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500">Subtotal</Text>
                    <Text className="font-bold text-black">
                      {formatPrice(service.price)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500">Discount</Text>
                    <Text className="font-bold text-green-500">$0.00</Text>
                  </View>
                  <View className="h-px bg-gray-100 my-3" />
                  <View className="flex-row justify-between">
                    <Text className="font-black text-black">Total</Text>
                    <Text className="font-black text-xl text-black">
                      {formatPrice(service.price)}
                    </Text>
                  </View>
                </View>

                {/* Demo Notice */}
                <View className="bg-yellow-50 p-3 rounded-xl mb-6 flex-row items-center">
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#EAB308"
                  />
                  <Text className="text-yellow-700 text-xs ml-2 flex-1">
                    This is a demo. No real payment will be processed.
                  </Text>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                  onPress={handlePurchase}
                  disabled={purchaseService.isPending}
                  className="bg-black py-4 rounded-2xl items-center"
                >
                  {purchaseService.isPending ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator color="#fff" size="small" />
                      <Text className="text-white font-black ml-2">
                        Processing...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white font-black">
                      Confirm Purchase
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* Success State */
              <View className="items-center py-8">
                <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
                  <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
                </View>
                <Text className="text-2xl font-black text-black mb-2">
                  Purchase Complete!
                </Text>
                <Text className="text-gray-400 text-center mb-8">
                  You now have access to all course content.
                </Text>
                <TouchableOpacity
                  onPress={handleCloseSuccess}
                  className="bg-black py-4 px-12 rounded-2xl"
                >
                  <Text className="text-white font-black">Start Learning</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
