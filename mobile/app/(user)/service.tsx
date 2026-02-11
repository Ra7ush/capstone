import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useMemo, useEffect } from "react";
import { useAllServices, usePurchasedServiceIds } from "@/hooks/useServices";
import { StarRating } from "@/components";
import type { Service } from "@/types";

const CATEGORIES = [
  "All",
  "Technology",
  "Business",
  "Design",
  "Marketing",
  "Finance",
  "Health",
  "Lifestyle",
];

/**
 * User Services Screen - Browse and purchase courses
 *
 * Features:
 * - Browse all published courses
 * - Filter by category
 * - Search functionality
 * - View purchased courses
 * - Navigate to service details
 */
export default function UserServices() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: services,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useAllServices(activeCategory, debouncedSearch);

  // Debug: log the services data
  useEffect(() => {
    if (error) {
      console.error("Error loading services:", error);
    }
    if (services) {
      console.log("Loaded services:", services.length, services);
    }
  }, [services, error]);

  const { data: purchasedIds = [] } = usePurchasedServiceIds();

  // Filter services based on current filters
  const displayedServices = useMemo(() => {
    if (!services) return [];
    return services;
  }, [services]);

  // Get purchased services
  const purchasedServices = useMemo(() => {
    if (!services || !purchasedIds.length) return [];
    return services.filter((s: Service) => purchasedIds.includes(s.id));
  }, [services, purchasedIds]);

  // Non-purchased services
  const availableServices = useMemo(() => {
    if (!services) return [];
    return services.filter((s: Service) => !purchasedIds.includes(s.id));
  }, [services, purchasedIds]);

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined || price === 0) return "Free";
    return `$${price.toFixed(2)}`;
  };

  const handleServicePress = (service: Service) => {
    router.push({
      pathname: "/service-detail" as const,
      params: { id: service.id },
    } as any);
  };

  const renderServiceCard = (
    service: Service,
    isPurchased: boolean = false,
  ) => (
    <TouchableOpacity
      key={service.id}
      className="w-[48%] mb-6"
      onPress={() => handleServicePress(service)}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View className="w-full h-36 rounded-2xl overflow-hidden border border-gray-100 mb-3 bg-gray-50">
        {service.thumbnail_url ? (
          <Image
            source={{ uri: service.thumbnail_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50">
            <Ionicons name="school-outline" size={36} color="#D1D5DB" />
          </View>
        )}
        {/* Price Badge */}
        <View
          className="absolute top-2 right-2 px-2.5 py-1 rounded-full shadow-sm"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.95)", elevation: 1 }}
        >
          <Text className="text-black font-black text-[10px]">
            {formatPrice(service.price)}
          </Text>
        </View>
        {/* Purchased Badge */}
        {isPurchased && (
          <View className="absolute top-2 left-2 bg-green-500 px-2.5 py-1 rounded-full flex-row items-center">
            <Ionicons name="checkmark-circle" size={10} color="white" />
            <Text className="text-white font-black text-[10px] ml-1">
              OWNED
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <Text className="text-black font-black text-sm mb-1" numberOfLines={2}>
        {service.title}
      </Text>

      {/* Creator Info */}
      <View className="flex-row items-center mb-1.5">
        {service.creator?.profile_image_url ? (
          <Image
            source={{ uri: service.creator.profile_image_url }}
            className="w-4 h-4 rounded-full mr-1.5"
          />
        ) : (
          <View className="w-4 h-4 rounded-full bg-gray-200 mr-1.5 items-center justify-center">
            <Ionicons name="person" size={8} color="#9CA3AF" />
          </View>
        )}
        <Text className="text-gray-400 text-xs font-medium" numberOfLines={1}>
          {service.creator?.username || "Creator"}
        </Text>
      </View>

      {/* Rating */}
      {service.total_reviews > 0 && (
        <View className="flex-row items-center mb-1.5">
          <StarRating rating={service.average_rating} size={10} />
          <Text className="text-amber-500 font-bold text-[10px] ml-1">
            {service.average_rating.toFixed(1)}
          </Text>
          <Text className="text-gray-400 text-[10px] ml-0.5">
            ({service.total_reviews})
          </Text>
        </View>
      )}

      {/* Category & Modules */}
      <View className="flex-row items-center justify-between">
        {service.category && (
          <View className="bg-gray-100 px-2 py-0.5 rounded-full">
            <Text className="text-gray-500 text-[10px] font-bold">
              {service.category}
            </Text>
          </View>
        )}
        <View className="flex-row items-center">
          <Ionicons name="layers-outline" size={10} color="#9CA3AF" />
          <Text className="text-gray-400 text-[10px] font-bold ml-1">
            {service.modules_count || 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-14 pb-4 bg-white">
        <Text className="text-2xl font-black text-black">Explore</Text>
        <Text className="text-gray-400 mt-1">
          Discover courses from top creators
        </Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-4">
        <View className="bg-gray-50 flex-row items-center px-4 py-3 rounded-2xl border border-gray-100">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Search courses..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-black font-medium"
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              // Debounce
              // setTimeout(() => setDebouncedSearch(text), 300);
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-full border mr-2 ${
                activeCategory === category
                  ? "bg-black border-black"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`font-bold text-xs ${
                  activeCategory === category ? "text-white" : "text-gray-500"
                }`}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Loading State */}
        {isLoading && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#000" />
            <Text className="text-gray-400 font-bold mt-4">
              Loading courses...
            </Text>
          </View>
        )}

        {/* Content */}
        {!isLoading && (
          <View className="px-5 pb-8">
            {/* My Courses Section */}
            {purchasedServices.length > 0 && (
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    My Courses
                  </Text>
                  <View className="bg-green-100 px-2 py-1 rounded-full">
                    <Text className="text-green-600 text-[10px] font-black">
                      {purchasedServices.length} Owned
                    </Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap justify-between">
                  {purchasedServices.map((service: Service) =>
                    renderServiceCard(service, true),
                  )}
                </View>
              </View>
            )}

            {/* Available Courses */}
            <View>
              {purchasedServices.length > 0 && (
                <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                  Browse More
                </Text>
              )}
              <View className="flex-row flex-wrap justify-between">
                {availableServices.map((service: Service) =>
                  renderServiceCard(service, false),
                )}
              </View>
            </View>

            {/* Empty State */}
            {displayedServices.length === 0 && !isLoading && (
              <View className="items-center justify-center py-20">
                <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-6">
                  <Ionicons name="school-outline" size={40} color="#9CA3AF" />
                </View>
                <Text className="text-xl font-bold text-black text-center mb-2">
                  {search ? "No Results" : "No Courses Yet"}
                </Text>
                <Text className="text-gray-400 text-center px-8">
                  {search
                    ? `No courses match "${search}"`
                    : activeCategory !== "All"
                      ? `No ${activeCategory} courses available yet`
                      : "Check back soon for new courses from creators"}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
