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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo, useEffect } from "react";
import { useAllServices, usePurchasedServiceIds } from "@/hooks/useServices";
import { useAISmartSearch } from "@/hooks/useAI";
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
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [aiSearchEnabled, setAiSearchEnabled] = useState(false);
  const [aiResults, setAiResults] = useState<Service[] | null>(null);
  const aiSmartSearch = useAISmartSearch();

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
      <View 
        className="px-5 pb-4 bg-white"
        style={{ paddingTop: Math.max(insets.top, 20) + 12 }}
      >
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
            placeholder={
              aiSearchEnabled
                ? "Ask AI: e.g. 'I want to learn design'"
                : "Search courses..."
            }
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-black font-medium"
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              if (!aiSearchEnabled) {
                // Normal text search — clear AI results
                setAiResults(null);
              }
            }}
            onSubmitEditing={() => {
              if (aiSearchEnabled && search.trim()) {
                aiSmartSearch.mutate(search.trim(), {
                  onSuccess: (res) => setAiResults(res.data || []),
                });
              }
            }}
            returnKeyType={aiSearchEnabled ? "search" : "done"}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                setDebouncedSearch("");
                setAiResults(null);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              setAiSearchEnabled(!aiSearchEnabled);
              setAiResults(null);
            }}
            className={`ml-2 w-9 h-9 rounded-full items-center justify-center ${
              aiSearchEnabled ? "bg-purple-100" : "bg-gray-100"
            }`}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={aiSearchEnabled ? "#7C3AED" : "#9CA3AF"}
            />
          </TouchableOpacity>
        </View>
        {aiSearchEnabled && (
          <Text className="text-[11px] text-purple-500 font-medium mt-1.5 ml-1">
            AI Search enabled — type naturally and press search
          </Text>
        )}
        {aiSmartSearch.isPending && (
          <View className="flex-row items-center mt-2 ml-1">
            <ActivityIndicator size="small" color="#7C3AED" />
            <Text className="text-purple-500 text-xs font-medium ml-2">
              AI is searching...
            </Text>
          </View>
        )}
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
            {/* AI Search Results */}
            {aiResults !== null ? (
              <View>
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <Ionicons name="sparkles" size={14} color="#7C3AED" />
                    <Text className="text-xs font-black text-purple-500 uppercase tracking-widest ml-1.5">
                      AI Results
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-[10px] font-bold">
                    {aiResults.length} found
                  </Text>
                </View>
                {aiResults.length > 0 ? (
                  <View className="flex-row flex-wrap justify-between">
                    {aiResults.map((service: Service) =>
                      renderServiceCard(
                        service,
                        purchasedIds.includes(service.id),
                      ),
                    )}
                  </View>
                ) : (
                  <View className="items-center py-12">
                    <Ionicons name="search-outline" size={40} color="#D1D5DB" />
                    <Text className="text-gray-400 font-bold mt-3">
                      No courses match your query
                    </Text>
                    <Text className="text-gray-300 text-xs mt-1">
                      Try rephrasing your search
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <>
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
                      <Ionicons
                        name="school-outline"
                        size={40}
                        color="#9CA3AF"
                      />
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
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
