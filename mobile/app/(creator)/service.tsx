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
import { useState, useMemo } from "react";
import { useMyServices } from "@/hooks/useServices";
import { useUser } from "@/hooks/useProfile";
import type { Service } from "@/types";

const STATUS_FILTERS = ["All", "Published", "Draft"];

export default function ServiceTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: response, isLoading, isRefetching, refetch } = useMyServices();
  const { data: profile, isLoading: isLoadingProfile } = useUser();
  const services = response?.data;
  const meta = response?.meta;
  const [activeStatus, setActiveStatus] = useState("All");
  const [search, setSearch] = useState("");

  // Filter services based on status and search
  const filteredServices = useMemo(() => {
    if (!services) return [];

    return services.filter((service: Service) => {
      const matchesStatus =
        activeStatus === "All" ||
        (activeStatus === "Published" && service.status === "published") ||
        (activeStatus === "Draft" && service.status === "draft");

      const matchesSearch = service.title
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [services, activeStatus, search]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!services) return { total: 0, published: 0, draft: 0 };

    return {
      total: services.length,
      published: services.filter((s: Service) => s.status === "published")
        .length,
      draft: services.filter((s: Service) => s.status === "draft").length,
    };
  }, [services]);

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "Free";
    return `$${price.toFixed(2)}`;
  };

  const isVerified = profile?.verification_status === "verified";
  const isPending = profile?.verification_status === "pending";
  const isRejected = profile?.verification_status === "rejected";

  if (!isLoadingProfile && !isVerified) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="dark" />
        <View className="flex-1 px-8 items-center justify-center">
          <View className="w-24 h-24 rounded-full bg-gray-50 items-center justify-center mb-8">
            <Ionicons
              name={isPending ? "time-outline" : "lock-closed-outline"}
              size={48}
              color={isPending ? "#EAB308" : "#EF4444"}
            />
          </View>
          <Text className="text-3xl font-black text-black text-center mb-4">
            {isPending ? "Review in Progress" : "Service Tab Locked"}
          </Text>
          <Text className="text-gray-400 font-bold text-center leading-6 mb-12">
            {isPending
              ? "Your creator identity is currently being verified. You'll be able to manage your services once the review is complete."
              : isRejected
                ? "Your verification request was not approved. Please review our guidelines and update your identity documents to unlock this tab."
                : "Complete your identity verification to start creating and managing your digital services."}
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/verification-apply")}
            className="w-full bg-black py-5 rounded-[2rem] items-center"
          >
            <Text className="text-white font-black text-sm uppercase tracking-widest">
              {isRejected ? "Retry Verification" : "Verify Identity"}
            </Text>
          </TouchableOpacity>

          {(isPending || isRejected) && (
            <TouchableOpacity
              onPress={() => router.push("/help")}
              className="mt-6"
            >
              <Text className="text-gray-400 font-black text-[10px] uppercase tracking-widest">
                Contact Support
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header */}
      <View 
        className="px-6 pb-4 bg-white"
        style={{ paddingTop: Math.max(insets.top, 20) + 12 }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-2xl font-black text-black">My Courses</Text>
            <Text className="text-gray-400 text-xs mt-1">
              {stats.total} course{stats.total !== 1 ? "s" : ""} •{" "}
              {stats.published} published
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/service-create")}
            className="bg-black px-4 py-2 rounded-full flex-row items-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-black text-sm ml-1">
              New Course
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="bg-gray-50 flex-row items-center px-4 py-3 rounded-2xl border border-gray-100 mb-6">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Search your courses..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-black font-medium"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row gap-2"
        >
          {STATUS_FILTERS.map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setActiveStatus(status)}
              className={`px-6 py-2.5 rounded-full border ${
                activeStatus === status
                  ? "bg-black border-black"
                  : "bg-white border-gray-100"
              } mr-2`}
            >
              <Text
                className={`font-black text-[10px] uppercase tracking-widest ${
                  activeStatus === status ? "text-white" : "text-gray-400"
                }`}
              >
                {status}
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

        {/* Course List */}
        {!isLoading && (
          <View className="px-6 py-4 flex-row flex-wrap justify-between">
            {filteredServices.map((service: Service) => (
              <TouchableOpacity
                key={service.id}
                className="w-[48%] mb-8"
                onPress={() =>
                  router.push({
                    pathname: "/course-detail" as const,
                    params: { id: service.id },
                  } as any)
                }
              >
                {/* Image Container */}
                <View className="w-full h-40 rounded-[2rem] overflow-hidden border border-gray-100 mb-3 bg-gray-50">
                  {service.thumbnail_url ? (
                    <Image
                      source={{ uri: service.thumbnail_url }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center bg-gray-100">
                      <Ionicons
                        name="school-outline"
                        size={40}
                        color="#D1D5DB"
                      />
                    </View>
                  )}
                  {/* Price Badge */}
                  <View className="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded-full border border-gray-100">
                    <Text className="text-black font-black text-[10px]">
                      {formatPrice(service.price)}
                    </Text>
                  </View>
                  {/* Status Badge */}
                  {service.status === "draft" && (
                    <View className="absolute top-3 left-3 bg-gray-800 px-2 py-1 rounded-full">
                      <Text className="text-white font-black text-[10px] uppercase">
                        Draft
                      </Text>
                    </View>
                  )}
                  {service.status === "published" && (
                    <View className="absolute top-3 left-3 bg-green-500 px-2 py-1 rounded-full">
                      <Text className="text-white font-black text-[10px] uppercase">
                        Live
                      </Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <Text
                  className="text-black font-black text-sm mb-1"
                  numberOfLines={2}
                >
                  {service.title}
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="layers-outline" size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-[10px] font-bold ml-1">
                      {service.modules_count || 0} modules
                    </Text>
                  </View>
                  {service.category && (
                    <Text className="text-gray-300 text-[10px] font-bold">
                      {service.category}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Empty State */}
            {filteredServices.length === 0 && !isLoading && (
              <View className="w-full items-center justify-center py-20">
                <View className="w-20 h-20 rounded-full bg-gray-50 items-center justify-center mb-4">
                  <Ionicons name="school-outline" size={32} color="#D1D5DB" />
                </View>
                <Text className="text-gray-400 font-bold text-center">
                  {search
                    ? "No courses match your search"
                    : activeStatus !== "All"
                      ? `No ${activeStatus.toLowerCase()} courses`
                      : "No courses yet"}
                </Text>
                {!search && activeStatus === "All" && (
                  <TouchableOpacity
                    onPress={() => router.push("/service-create")}
                    className="mt-4 bg-black px-6 py-3 rounded-full"
                  >
                    <Text className="text-white font-black text-sm">
                      Create Your First Course
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Stats Summary */}
        {!isLoading && services && services.length > 0 && (
          <View className="mx-6 mb-12 bg-black rounded-[2.5rem] p-6 shadow-xl shadow-black/20">
            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">
              Course Overview
            </Text>
            <View className="flex-row justify-between">
              <View>
                <Text className="text-white text-2xl font-black">
                  {stats.total}
                </Text>
                <Text className="text-gray-500 text-[10px] font-black uppercase">
                  Total
                </Text>
              </View>
              <View>
                <Text className="text-white text-2xl font-black">
                  {stats.published}
                </Text>
                <Text className="text-gray-500 text-[10px] font-black uppercase">
                  Published
                </Text>
              </View>
              <View>
                <Text className="text-white text-2xl font-black">
                  {stats.draft}
                </Text>
                <Text className="text-gray-500 text-[10px] font-black uppercase">
                  Drafts
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
