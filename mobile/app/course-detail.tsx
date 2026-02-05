import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  useService,
  useUpdateService,
  useDeleteService,
  usePublishService,
  useUnpublishService,
  useCreateModule,
  useDeleteModule,
  useCreateLesson,
  useDeleteLesson,
  useUpdateModule,
  useUpdateLesson,
  useMyServices,
} from "@/hooks/useServices";
import type { CourseModule, Lesson } from "@/types";

export default function CourseDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: service, isLoading, refetch } = useService(id);
  const { data: myServicesResponse } = useMyServices();
  const meta = myServicesResponse?.meta;

  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const publishService = usePublishService();
  const unpublishService = useUnpublishService();
  const createModule = useCreateModule();
  const deleteModule = useDeleteModule();
  const createLesson = useCreateLesson();
  const deleteLesson = useDeleteLesson();
  const updateModule = useUpdateModule();
  const updateLesson = useUpdateLesson();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [showAddModule, setShowAddModule] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );
  const [addingLessonToModule, setAddingLessonToModule] = useState<
    string | null
  >(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");
  const [newLessonVideo, setNewLessonVideo] = useState("");
  const [newLessonPreview, setNewLessonPreview] = useState(false);

  // Editing Module/Lesson state
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonDescription, setEditLessonDescription] = useState("");
  const [editLessonVideo, setEditLessonVideo] = useState("");
  const [editLessonPreview, setEditLessonPreview] = useState(false);

  useEffect(() => {
    if (service) {
      setEditTitle(service.title);
      setEditDescription(service.description || "");
      setEditPrice(service.price?.toString() || "");
    }
  }, [service]);

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      await updateService.mutateAsync({
        id,
        data: {
          title: editTitle,
          description: editDescription,
          price: editPrice ? parseFloat(editPrice) : undefined,
        },
      });
      setIsEditing(false);
      refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to update course");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Course",
      "Are you sure you want to delete this course? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteService.mutateAsync(id!);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete course");
            }
          },
        },
      ],
    );
  };

  const handleTogglePublish = async () => {
    if (!id) return;
    try {
      if (service?.status === "published") {
        await unpublishService.mutateAsync(id);
      } else {
        // Check limits before publishing
        if (
          meta &&
          !meta.is_pro &&
          meta.published_count >= (meta.free_services_allowed || 1)
        ) {
          Alert.alert(
            "Free Plan Limit Reached",
            "You can only publish 1 course on the free plan. Upgrade to Pro to publish unlimited courses.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Upgrade to Pro",
                onPress: () => {
                  router.push("/subscription-upgrade");
                },
              },
            ],
          );
          return;
        }

        await publishService.mutateAsync(id);
      }
      refetch();
    } catch (error: any) {
      if (error?.response?.data?.code === "FREE_PLAN_LIMIT") {
        Alert.alert(
          "Free Plan Limit Reached",
          "You can only publish 1 course on the free plan. Upgrade to Pro to publish unlimited courses.",
        );
      } else {
        Alert.alert("Error", "Failed to update publish status");
      }
    }
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || !id) return;
    try {
      await createModule.mutateAsync({
        serviceId: id,
        title: newModuleTitle.trim(),
      });
      setNewModuleTitle("");
      setShowAddModule(false);
      refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to add module");
    }
  };

  const handleDeleteModule = (moduleId: string, moduleTitle: string) => {
    Alert.alert(
      "Delete Module",
      `Are you sure you want to delete "${moduleTitle}"? All lessons in this module will be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteModule.mutateAsync({ moduleId, serviceId: id! });
              refetch();
            } catch (error) {
              Alert.alert("Error", "Failed to delete module");
            }
          },
        },
      ],
    );
  };

  const handleAddLesson = async (moduleId: string) => {
    if (!newLessonTitle.trim() || !id) return;
    try {
      await createLesson.mutateAsync({
        moduleId,
        serviceId: id,
        data: {
          title: newLessonTitle.trim(),
          description: newLessonDescription.trim() || undefined,
          video_url: newLessonVideo.trim() || undefined,
          is_preview: newLessonPreview,
        },
      });
      setNewLessonTitle("");
      setNewLessonDescription("");
      setNewLessonVideo("");
      setNewLessonPreview(false);
      setAddingLessonToModule(null);
      refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to add lesson");
    }
  };

  const handleDeleteLesson = (lessonId: string, lessonTitle: string) => {
    Alert.alert(
      "Delete Lesson",
      `Are you sure you want to delete "${lessonTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLesson.mutateAsync({ lessonId, serviceId: id! });
              refetch();
            } catch (error) {
              Alert.alert("Error", "Failed to delete lesson");
            }
          },
        },
      ],
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleUpdateModule = async (moduleId: string) => {
    if (!editModuleTitle.trim() || !id) return;
    try {
      await updateModule.mutateAsync({
        moduleId,
        serviceId: id,
        data: { title: editModuleTitle.trim() },
      });
      setEditingModuleId(null);
      refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to update module");
    }
  };

  const handleUpdateLesson = async (lessonId: string) => {
    if (!editLessonTitle.trim() || !id) return;
    try {
      await updateLesson.mutateAsync({
        lessonId,
        serviceId: id,
        data: {
          title: editLessonTitle.trim(),
          description: editLessonDescription.trim(),
          video_url: editLessonVideo.trim(),
          is_preview: editLessonPreview,
        },
      });
      setEditingLessonId(null);
      refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to update lesson");
    }
  };

  const startEditingModule = (module: CourseModule) => {
    setEditingModuleId(module.id);
    setEditModuleTitle(module.title);
  };

  const startEditingLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setEditLessonTitle(lesson.title);
    setEditLessonDescription(lesson.description || "");
    setEditLessonVideo(lesson.video_url || "");
    setEditLessonPreview(lesson.is_preview);
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
          title: "Course Details",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View className="flex-row mr-2">
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                className="mr-4"
              >
                <Ionicons
                  name={isEditing ? "close" : "create-outline"}
                  size={24}
                  color="black"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ),
          headerTitleStyle: {
            fontFamily: "System",
            fontWeight: "900",
          },
        }}
      />
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Course Info */}
        <View className="p-6">
          {/* Status Badge */}
          <View className="flex-row items-center mb-4">
            <View
              className={`px-3 py-1 rounded-full ${
                service.status === "published" ? "bg-green-100" : "bg-gray-100"
              }`}
            >
              <Text
                className={`font-black text-xs uppercase ${
                  service.status === "published"
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {service.status}
              </Text>
            </View>
            {service.category && (
              <View className="ml-2 px-3 py-1 rounded-full bg-gray-100">
                <Text className="font-bold text-xs text-gray-500">
                  {service.category}
                </Text>
              </View>
            )}
          </View>

          {/* Title */}
          {isEditing ? (
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              className="text-2xl font-black text-black mb-2 p-2 bg-gray-50 rounded-xl"
              placeholder="Course title"
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <Text className="text-2xl font-black text-black mb-2">
              {service.title}
            </Text>
          )}

          {/* Description */}
          {isEditing ? (
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={4}
              className="text-gray-500 mb-4 p-2 bg-gray-50 rounded-xl min-h-[100px]"
              textAlignVertical="top"
              placeholder="Course description..."
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <Text className="text-gray-500 mb-4">
              {service.description || "No description"}
            </Text>
          )}

          {/* Price */}
          <View className="flex-row items-center mb-6">
            <Text className="text-gray-400 font-bold mr-2">Price:</Text>
            {isEditing ? (
              <TextInput
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="numeric"
                className="font-black text-black p-2 bg-gray-50 rounded-xl flex-1"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text className="text-xl font-black text-black">
                {service.price ? `$${service.price.toFixed(2)}` : "Free"}
              </Text>
            )}
          </View>

          {/* Edit Actions */}
          {isEditing && (
            <Button
              title="Save Changes"
              onPress={handleSaveEdit}
              variant="brand"
              loading={updateService.isPending}
            />
          )}

          {/* Publish Toggle */}
          {!isEditing && (
            <TouchableOpacity
              onPress={handleTogglePublish}
              disabled={publishService.isPending || unpublishService.isPending}
              className={`py-4 rounded-2xl items-center ${
                service.status === "published" ? "bg-gray-100" : "bg-green-500"
              }`}
            >
              {publishService.isPending || unpublishService.isPending ? (
                <ActivityIndicator
                  color={service.status === "published" ? "#000" : "#fff"}
                />
              ) : (
                <Text
                  className={`font-black ${
                    service.status === "published" ? "text-black" : "text-white"
                  }`}
                >
                  {service.status === "published"
                    ? "Unpublish"
                    : "Publish Course"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Modules Section */}
        <View className="px-6 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Modules ({service.modules?.length || 0})
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModule(true)}
              className="flex-row items-center"
            >
              <Ionicons name="add-circle" size={20} color="#000" />
              <Text className="font-bold text-black ml-1">Add Module</Text>
            </TouchableOpacity>
          </View>

          {/* Add Module Form */}
          {showAddModule && (
            <View className="bg-gray-50 p-4 rounded-2xl mb-4">
              <TextInput
                value={newModuleTitle}
                onChangeText={setNewModuleTitle}
                placeholder="Module title..."
                placeholderTextColor="#9CA3AF"
                className="bg-white p-3 rounded-xl mb-3 font-bold"
              />
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => setShowAddModule(false)}
                  className="flex-1 py-3 items-center"
                >
                  <Text className="font-bold text-gray-400">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddModule}
                  disabled={createModule.isPending}
                  className="flex-1 bg-black py-3 rounded-xl items-center"
                >
                  {createModule.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="font-black text-white">Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Modules List */}
          {service.modules?.map((module: CourseModule, index: number) => (
            <View
              key={module.id}
              className="bg-gray-50 rounded-2xl mb-4 overflow-hidden"
            >
              {/* Module Header */}
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-8 h-8 rounded-full bg-black items-center justify-center mr-3">
                    <Text className="text-white font-black text-sm">
                      {index + 1}
                    </Text>
                  </View>
                  {editingModuleId === module.id ? (
                    <View className="flex-1 flex-row items-center">
                      <TextInput
                        value={editModuleTitle}
                        onChangeText={setEditModuleTitle}
                        className="flex-1 bg-white p-2 rounded-lg font-bold border border-gray-100"
                        autoFocus
                        placeholder="Module title..."
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity
                        onPress={() => handleUpdateModule(module.id)}
                        className="ml-2 p-2"
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#10B981"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditingModuleId(null)}
                        className="p-2"
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => toggleModule(module.id)}
                      className="flex-1"
                    >
                      <Text className="font-black text-black" numberOfLines={1}>
                        {module.title}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {module.lessons?.length || 0} lessons
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View className="flex-row items-center">
                  {!editingModuleId && (
                    <>
                      <TouchableOpacity
                        onPress={() => startEditingModule(module)}
                        className="mr-3"
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color="#000"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteModule(module.id, module.title)
                        }
                        className="mr-3"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity onPress={() => toggleModule(module.id)}>
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
                </View>
              </View>

              {/* Expanded Lessons */}
              {expandedModules.has(module.id) && (
                <View className="px-4 pb-4">
                  {module.lessons?.map((lesson: Lesson, lessonIndex: number) =>
                    editingLessonId === lesson.id ? (
                      <View
                        key={lesson.id}
                        className="bg-white p-4 rounded-xl mb-2 border border-gray-100"
                      >
                        <TextInput
                          value={editLessonTitle}
                          onChangeText={setEditLessonTitle}
                          placeholder="Lesson Title"
                          placeholderTextColor="#9CA3AF"
                          className="bg-gray-50 p-3 rounded-lg mb-2 font-bold"
                        />
                        <TextInput
                          value={editLessonDescription}
                          onChangeText={setEditLessonDescription}
                          placeholder="Lesson Description"
                          placeholderTextColor="#9CA3AF"
                          multiline
                          className="bg-gray-50 p-3 rounded-lg mb-2 min-h-[60px]"
                          textAlignVertical="top"
                        />
                        <TextInput
                          value={editLessonVideo}
                          onChangeText={setEditLessonVideo}
                          placeholder="Video URL"
                          placeholderTextColor="#9CA3AF"
                          className="bg-gray-50 p-3 rounded-lg mb-3"
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={() =>
                            setEditLessonPreview(!editLessonPreview)
                          }
                          className="flex-row items-center mb-4"
                        >
                          <Ionicons
                            name={editLessonPreview ? "eye" : "eye-off"}
                            size={20}
                            color={editLessonPreview ? "#FF4D00" : "#9CA3AF"}
                          />
                          <Text
                            className={`ml-2 font-bold ${editLessonPreview ? "text-[#FF4D00]" : "text-gray-400"}`}
                          >
                            {editLessonPreview ? "Free Preview" : "Paid Only"}
                          </Text>
                        </TouchableOpacity>
                        <View className="flex-row">
                          <TouchableOpacity
                            onPress={() => setEditingLessonId(null)}
                            className="flex-1 py-3 items-center"
                          >
                            <Text className="font-bold text-gray-400">
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleUpdateLesson(lesson.id)}
                            className="flex-1 bg-black py-3 rounded-xl items-center"
                          >
                            <Text className="font-black text-white">Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
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
                          <View className="flex-row items-center mt-1">
                            {lesson.video_url && (
                              <View className="flex-row items-center mr-3">
                                <Ionicons
                                  name="videocam"
                                  size={12}
                                  color="#9CA3AF"
                                />
                                {lesson.video_duration && (
                                  <Text className="text-gray-400 text-xs ml-1">
                                    {formatDuration(lesson.video_duration)}
                                  </Text>
                                )}
                              </View>
                            )}
                            {lesson.is_preview && (
                              <View className="bg-blue-100 px-2 py-0.5 rounded">
                                <Text className="text-blue-600 text-[10px] font-bold">
                                  Preview
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View className="flex-row items-center">
                          <TouchableOpacity
                            onPress={() => startEditingLesson(lesson)}
                            className="mr-3"
                          >
                            <Ionicons
                              name="create-outline"
                              size={18}
                              color="#000"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              handleDeleteLesson(lesson.id, lesson.title)
                            }
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ),
                  )}

                  {/* Add Lesson Form */}
                  {addingLessonToModule === module.id ? (
                    <View className="bg-white p-3 rounded-xl">
                      <TextInput
                        value={newLessonTitle}
                        onChangeText={setNewLessonTitle}
                        placeholder="Lesson Title"
                        placeholderTextColor="#9CA3AF"
                        className="bg-gray-50 p-3 rounded-lg mb-2 font-bold"
                      />
                      <TextInput
                        value={newLessonDescription}
                        onChangeText={setNewLessonDescription}
                        placeholder="Lesson Description"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        className="bg-gray-50 p-3 rounded-lg mb-2 min-h-[60px]"
                        textAlignVertical="top"
                      />
                      <TextInput
                        value={newLessonVideo}
                        onChangeText={setNewLessonVideo}
                        placeholder="Video URL (optional)..."
                        placeholderTextColor="#9CA3AF"
                        className="bg-gray-50 p-3 rounded-lg mb-3"
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setNewLessonPreview(!newLessonPreview)}
                        className="flex-row items-center mb-4"
                      >
                        <Ionicons
                          name={newLessonPreview ? "eye" : "eye-off"}
                          size={20}
                          color={newLessonPreview ? "#FF4D00" : "#9CA3AF"}
                        />
                        <Text
                          className={`ml-2 font-bold ${newLessonPreview ? "text-[#FF4D00]" : "text-gray-400"}`}
                        >
                          {newLessonPreview ? "Free Preview" : "Paid Only"}
                        </Text>
                      </TouchableOpacity>
                      <View className="flex-row">
                        <TouchableOpacity
                          onPress={() => setAddingLessonToModule(null)}
                          className="flex-1 py-3 items-center"
                        >
                          <Text className="font-bold text-gray-400">
                            Cancel
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleAddLesson(module.id)}
                          disabled={createLesson.isPending}
                          className="flex-1 bg-black py-3 rounded-xl items-center"
                        >
                          {createLesson.isPending ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text className="font-black text-white">Add</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setAddingLessonToModule(module.id)}
                      className="flex-row items-center justify-center py-3 border-2 border-dashed border-gray-200 rounded-xl"
                    >
                      <Ionicons name="add" size={18} color="#9CA3AF" />
                      <Text className="font-bold text-gray-400 ml-1">
                        Add Lesson
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Empty Modules State */}
          {(!service.modules || service.modules.length === 0) && (
            <View className="items-center py-8">
              <Ionicons name="layers-outline" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 font-bold mt-2">
                No modules yet
              </Text>
              <Text className="text-gray-300 text-sm">
                Add modules to organize your course content
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
