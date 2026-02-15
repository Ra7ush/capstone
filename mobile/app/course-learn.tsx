import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useService, usePurchasedServiceIds } from "@/hooks/useServices";
import { useAuth } from "@/context/AuthContext";
import type { CourseModule, Lesson } from "@/types";

/**
 * Course Learn Screen — Learner-focused view
 * Shows course content (modules → lessons) so a purchased user can start learning.
 */
export default function CourseLearn() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: service, isLoading } = useService(id!);
  const { data: purchasedIds = [], isLoading: isPurchaseLoading } =
    usePurchasedServiceIds();

  const isPurchased = purchasedIds.includes(id || "");
  const isCreator = service?.creator_id === session?.user?.id;

  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const getTotalLessons = () => {
    if (!service?.modules) return 0;
    return service.modules.reduce(
      (total: number, mod: CourseModule) => total + (mod.lessons?.length || 0),
      0,
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ── Loading ──
  if (isLoading || isPurchaseLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#000" />
        <Text className="text-gray-400 font-bold mt-4">Loading course...</Text>
      </View>
    );
  }

  // ── Not Found ──
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

  // ── Purchase Guard — redirect if user hasn't purchased (and isn't the creator) ──
  if (!isPurchased && !isCreator) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="lock-closed-outline" size={48} color="#D1D5DB" />
        <Text className="text-gray-800 font-black text-lg mt-4 text-center">
          Purchase Required
        </Text>
        <Text className="text-gray-400 text-sm text-center mt-2">
          You need to purchase this course before you can access the content.
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.replace({
              pathname: "/service-detail",
              params: { id },
            } as any)
          }
          className="bg-black py-4 px-8 rounded-2xl mt-6"
        >
          <Text className="text-white font-black text-sm">View Course</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-gray-500 font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Active Lesson View ──
  if (activeLesson) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />

        {/* Video / Content Area */}
        <View className="w-full h-56 bg-black items-center justify-center">
          {activeLesson.video_url ? (
            <>
              <Ionicons name="play-circle" size={64} color="white" />
              <Text className="text-white/70 text-xs font-medium mt-2">
                Tap to play video
              </Text>
              <TouchableOpacity
                className="absolute inset-0 items-center justify-center"
                onPress={() => {
                  if (activeLesson.video_url) {
                    Linking.openURL(activeLesson.video_url).catch((err) =>
                      console.warn("Could not open video URL:", err),
                    );
                  }
                }}
              />
            </>
          ) : (
            <>
              <Ionicons
                name="document-text-outline"
                size={48}
                color="#6B7280"
              />
              <Text className="text-gray-500 text-xs font-medium mt-2">
                No video for this lesson
              </Text>
            </>
          )}

          {/* Back button overlay */}
          <TouchableOpacity
            onPress={() => setActiveLesson(null)}
            className="absolute top-14 left-5 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Lesson Details */}
        <ScrollView className="flex-1 px-6 pt-6">
          <Text className="text-2xl font-black text-black mb-2">
            {activeLesson.title}
          </Text>
          {activeLesson.video_duration && (
            <View className="flex-row items-center mb-4">
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text className="text-gray-400 text-xs font-bold ml-1">
                {formatDuration(activeLesson.video_duration)}
              </Text>
            </View>
          )}
          {activeLesson.description ? (
            <Text className="text-gray-600 leading-6 mb-6">
              {activeLesson.description}
            </Text>
          ) : (
            <Text className="text-gray-400 text-sm mb-6">
              No description available for this lesson.
            </Text>
          )}

          {/* Open video externally button */}
          {activeLesson.video_url && (
            <TouchableOpacity
              onPress={() => Linking.openURL(activeLesson.video_url!)}
              className="bg-black py-4 rounded-2xl items-center flex-row justify-center mb-8"
            >
              <Ionicons name="play" size={18} color="white" />
              <Text className="text-white font-black text-sm ml-2">
                Play Video
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Main Course Content View ──
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
        {/* Hero */}
        <View className="w-full h-56 bg-gray-100">
          {service.thumbnail_url ? (
            <Image
              source={{ uri: service.thumbnail_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Ionicons name="school-outline" size={64} color="#D1D5DB" />
            </View>
          )}
        </View>

        {/* Content */}
        <View className="px-6 py-6 -mt-6 bg-white rounded-t-3xl">
          {/* Title */}
          <Text className="text-2xl font-black text-black mb-2">
            {service.title}
          </Text>

          {/* Creator */}
          <TouchableOpacity
            className="flex-row items-center mb-4"
            onPress={() =>
              router.push({
                pathname: "/creator/[id]",
                params: { id: service.creator_id },
              } as any)
            }
          >
            {service.creator?.profile_image_url ? (
              <Image
                source={{ uri: service.creator.profile_image_url }}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
                <Ionicons name="person" size={14} color="#9CA3AF" />
              </View>
            )}
            <Text className="text-gray-500 text-sm font-bold ml-2">
              {service.creator?.username || "Creator"}
            </Text>
          </TouchableOpacity>

          {/* Stats Row */}
          <View className="flex-row mb-6 gap-3">
            <View className="flex-1 bg-gray-50 p-3 rounded-2xl items-center">
              <Text className="text-lg font-black text-black">
                {service.modules?.length || 0}
              </Text>
              <Text className="text-gray-400 text-xs font-bold">Modules</Text>
            </View>
            <View className="flex-1 bg-gray-50 p-3 rounded-2xl items-center">
              <Text className="text-lg font-black text-black">
                {getTotalLessons()}
              </Text>
              <Text className="text-gray-400 text-xs font-bold">Lessons</Text>
            </View>
            {service.average_rating > 0 && (
              <View className="flex-1 bg-gray-50 p-3 rounded-2xl items-center">
                <View className="flex-row items-center">
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text className="text-lg font-black text-black ml-1">
                    {service.average_rating.toFixed(1)}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs font-bold">Rating</Text>
              </View>
            )}
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

          {/* Course Content (Modules & Lessons) */}
          <View className="mb-8">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Course Content
            </Text>

            {service.modules && service.modules.length > 0 ? (
              service.modules.map((mod: CourseModule, index: number) => (
                <View
                  key={mod.id}
                  className="bg-gray-50 rounded-2xl mb-3 overflow-hidden"
                >
                  {/* Module Header */}
                  <TouchableOpacity
                    onPress={() => toggleModule(mod.id)}
                    className="flex-row items-center p-4"
                  >
                    <View className="w-8 h-8 rounded-full bg-black items-center justify-center mr-3">
                      <Text className="text-white font-black text-sm">
                        {index + 1}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-black text-black" numberOfLines={1}>
                        {mod.title}
                      </Text>
                      <Text className="text-gray-400 text-xs font-bold">
                        {mod.lessons?.length || 0} lessons
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        expandedModules.has(mod.id)
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>

                  {/* Lessons List */}
                  {expandedModules.has(mod.id) && mod.lessons && (
                    <View className="px-4 pb-4">
                      {mod.lessons.map(
                        (lesson: Lesson, lessonIndex: number) => (
                          <TouchableOpacity
                            key={lesson.id}
                            className="flex-row items-center bg-white p-3 rounded-xl mb-2"
                            onPress={() => setActiveLesson(lesson)}
                            activeOpacity={0.7}
                          >
                            <View className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center mr-3">
                              <Ionicons
                                name={
                                  lesson.video_url
                                    ? "play"
                                    : "document-text-outline"
                                }
                                size={12}
                                color="#000"
                              />
                            </View>
                            <View className="flex-1">
                              <Text
                                className="font-bold text-black text-sm"
                                numberOfLines={1}
                              >
                                {lesson.title}
                              </Text>
                              {lesson.video_duration && (
                                <Text className="text-gray-400 text-[11px] font-medium mt-0.5">
                                  {formatDuration(lesson.video_duration)}
                                </Text>
                              )}
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color="#D1D5DB"
                            />
                          </TouchableOpacity>
                        ),
                      )}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View className="items-center py-8 bg-gray-50 rounded-2xl">
                <Ionicons
                  name="folder-open-outline"
                  size={40}
                  color="#D1D5DB"
                />
                <Text className="text-gray-400 font-bold mt-3">
                  No content yet
                </Text>
                <Text className="text-gray-300 text-xs mt-1">
                  The creator hasn&apos;t added lessons yet
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
