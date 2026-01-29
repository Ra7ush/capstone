import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ActionSheetIOS,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useServiceManagement, uploadCourseImage } from "@/hooks/useServices";

const SERVICE_TYPES = ["course", "digital", "service", "physical"];
const CATEGORIES = [
  "Development",
  "Business",
  "Design",
  "Marketing",
  "Health",
  "Education",
];

export default function CreateService() {
  const router = useRouter();
  const { createService, createModule, createLesson } = useServiceManagement();

  // Step state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [serviceType, setServiceType] = useState("course");
  const [category, setCategory] = useState("Development");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // Content state (for step 2)
  const [modules, setModules] = useState<any[]>([]);
  const [currentModuleTitle, setCurrentModuleTitle] = useState("");

  const handleImageUpload = async () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Photo Library", "Take Photo", "Browse Files"],
          cancelButtonIndex: 0,
          title: "Select Course Cover",
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) await pickFromLibrary();
          else if (buttonIndex === 2) await pickFromCamera();
          else if (buttonIndex === 3) await pickFromFiles();
        },
      );
    } else {
      Alert.alert("Select Image", "Choose source", [
        { text: "Library", onPress: pickFromLibrary },
        { text: "Camera", onPress: pickFromCamera },
        { text: "Files", onPress: pickFromFiles },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Error", "Permission needed");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) setThumbnail(result.assets[0].uri);
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return Alert.alert("Error", "Permission needed");

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) setThumbnail(result.assets[0].uri);
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled) setThumbnail(result.assets[0].uri);
    } catch {
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const addModule = () => {
    if (currentModuleTitle.trim()) {
      const newModule = {
        tempId: Date.now(),
        title: currentModuleTitle,
        lessons: [],
      };
      setModules([...modules, newModule]);
      setCurrentModuleTitle("");
    } else {
      Alert.alert("Error", "Please enter a module title");
    }
  };

  const addLessonToModule = (moduleTempId: number) => {
    const newLesson = {
      tempId: Date.now(),
      title: "",
      description: "",
      video_url: "",
      video_duration: 0,
      is_preview: false,
    };

    setModules(
      modules.map((m) =>
        m.tempId === moduleTempId
          ? { ...m, lessons: [...m.lessons, newLesson] }
          : m,
      ),
    );
  };

  const updateLesson = (
    moduleTempId: number,
    lessonTempId: number,
    field: string,
    value: any,
  ) => {
    setModules(
      modules.map((m) =>
        m.tempId === moduleTempId
          ? {
              ...m,
              lessons: m.lessons.map((l: any) =>
                l.tempId === lessonTempId ? { ...l, [field]: value } : l,
              ),
            }
          : m,
      ),
    );
  };

  const deleteModule = (moduleTempId: number) => {
    setModules(modules.filter((m) => m.tempId !== moduleTempId));
  };

  const deleteLesson = (moduleTempId: number, lessonTempId: number) => {
    setModules(
      modules.map((m) =>
        m.tempId === moduleTempId
          ? {
              ...m,
              lessons: m.lessons.filter((l: any) => l.tempId !== lessonTempId),
            }
          : m,
      ),
    );
  };

  const handleCreateService = async () => {
    if (!title.trim()) return Alert.alert("Error", "Please enter a title");
    if (!price || parseFloat(price) < 0)
      return Alert.alert("Error", "Enter a valid price");
    if (serviceType === "course" && modules.length === 0) {
      return Alert.alert("Error", "Add at least one module for your course");
    }

    setLoading(true);
    try {
      // 1. Upload thumbnail if exists
      let thumbnailUrl = "";
      if (thumbnail) {
        thumbnailUrl = await uploadCourseImage(thumbnail);
      }

      // 2. Create Service
      const serviceResult = await createService({
        title,
        description,
        category,
        price: parseFloat(price),
        thumbnail_url: thumbnailUrl,
      });

      const serviceId = serviceResult.data.id;

      // 3. Create Modules and Lessons (if Course)
      if (serviceType === "course") {
        for (const mod of modules) {
          const moduleResult = await createModule({
            serviceId,
            title: mod.title,
          });
          const moduleId = moduleResult.data.id;

          for (const les of mod.lessons) {
            await createLesson({
              moduleId,
              serviceId,
              data: {
                title: les.title || "Untitled Lesson",
                description: les.description,
                video_url: les.video_url,
                is_preview: les.is_preview,
              },
            });
          }
        }
      }

      Alert.alert("Success", "Service created successfully!", [
        { text: "OK", onPress: () => router.replace("/(tabs)/service") },
      ]);
    } catch (error) {
      console.error("Creation error:", error);
      Alert.alert("Error", "Failed to create service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToNextStep = () => {
    if (!title.trim()) return Alert.alert("Error", "Title is required");
    if (serviceType !== "course") {
      handleCreateService();
      return;
    }
    setStep(2);
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Service Type</Text>
        <View style={styles.buttonGrid}>
          {SERVICE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setServiceType(type)}
              style={[
                styles.typeButton,
                serviceType === type && styles.typeButtonActive,
              ]}
              disabled={type !== "course"} // Restriction mentioned earlier
            >
              <Text
                style={[
                  styles.typeButtonText,
                  serviceType === type && styles.typeButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                {type !== "course" && " (Soon)"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={handleImageUpload}
        style={styles.thumbnailContainer}
      >
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbnailImage} />
        ) : (
          <>
            <View style={styles.uploadIconContainer}>
              <Ionicons name="camera-outline" size={24} color="#FF4D00" />
            </View>
            <Text style={styles.uploadText}>Upload Service Cover</Text>
            <Text style={styles.uploadSubtext}>
              Recommended: 16:9 aspect ratio
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Title</Text>
        <TextInput
          placeholder="e.g. Complete React Native Masterclass"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[
                styles.categoryButton,
                category === cat && styles.categoryButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  category === cat && styles.categoryButtonTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Price ($)</Text>
        <TextInput
          placeholder="0.00"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          placeholder="What will your audience learn..."
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          placeholderTextColor="#9CA3AF"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Course Content</Text>
      <Text style={styles.stepSubTitle}>
        Organize your course into modules and lessons.
      </Text>

      {modules.map((m, idx) => (
        <View key={m.tempId} style={styles.moduleCard}>
          <View style={styles.moduleHeader}>
            <View style={styles.moduleInfo}>
              <View style={styles.moduleNumber}>
                <Text style={styles.moduleNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.moduleTitle}>{m.title}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteModule(m.tempId)}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {m.lessons.map((l: any, lIdx: number) => (
            <View key={l.tempId} style={styles.lessonCard}>
              <View style={styles.lessonHeader}>
                <Text style={styles.lessonLabel}>Lesson {lIdx + 1}</Text>
                <TouchableOpacity
                  onPress={() => deleteLesson(m.tempId, l.tempId)}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Lesson Title"
                value={l.title}
                onChangeText={(text) =>
                  updateLesson(m.tempId, l.tempId, "title", text)
                }
                style={styles.lessonInput}
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                placeholder="Lesson Description"
                value={l.description}
                onChangeText={(text) =>
                  updateLesson(m.tempId, l.tempId, "description", text)
                }
                style={[
                  styles.lessonInput,
                  { minHeight: 60, textAlignVertical: "top" },
                ]}
                placeholderTextColor="#9CA3AF"
                multiline
              />

              <TextInput
                placeholder="Video URL (YouTube/Vimeo)"
                value={l.video_url}
                onChangeText={(text) =>
                  updateLesson(m.tempId, l.tempId, "video_url", text)
                }
                style={styles.lessonInput}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />

              <TouchableOpacity
                onPress={() =>
                  updateLesson(m.tempId, l.tempId, "is_preview", !l.is_preview)
                }
                style={styles.previewToggle}
              >
                <Ionicons
                  name={l.is_preview ? "eye" : "eye-off"}
                  size={18}
                  color={l.is_preview ? "#FF4D00" : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.previewText,
                    l.is_preview && styles.previewTextActive,
                  ]}
                >
                  {l.is_preview ? "Free Preview enabled" : "Paid Only"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            onPress={() => addLessonToModule(m.tempId)}
            style={styles.addLessonButton}
          >
            <Ionicons name="add" size={20} color="black" />
            <Text style={styles.addLessonText}>Add Lesson</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.addModuleContainer}>
        <TextInput
          placeholder="New Module Title..."
          value={currentModuleTitle}
          onChangeText={setCurrentModuleTitle}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity onPress={addModule} style={styles.addModuleButton}>
          <Ionicons name="add-circle" size={24} color="#10B981" />
          <Text style={styles.addModuleText}>Add Module</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="dark" />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (step > 1 ? setStep(1) : router.back())}
          >
            <Ionicons name="chevron-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 1 ? "Create Service" : "Add Content"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {serviceType === "course" && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressStep,
                step >= 1 && styles.progressStepActive,
              ]}
            >
              <Text
                style={[
                  styles.progressText,
                  step >= 1 && styles.progressTextActive,
                ]}
              >
                1. Info
              </Text>
            </View>
            <View style={styles.progressLine} />
            <View
              style={[
                styles.progressStep,
                step >= 2 && styles.progressStepActive,
              ]}
            >
              <Text
                style={[
                  styles.progressText,
                  step >= 2 && styles.progressTextActive,
                ]}
              >
                2. Content
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? renderStep1() : renderStep2()}

          <View style={styles.actionContainer}>
            {step === 1 ? (
              <TouchableOpacity
                onPress={goToNextStep}
                style={[
                  styles.primaryButton,
                  loading && styles.primaryButtonDisabled,
                ]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {serviceType === "course"
                      ? "Next: Add Content"
                      : "Create Service"}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.multiActionContainer}>
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={styles.secondaryButton}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateService}
                  style={[
                    styles.primaryButton,
                    { flex: 2 },
                    loading && styles.primaryButtonDisabled,
                  ]}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Finish & Create
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            {!loading && (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#000000" },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  progressStep: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  progressStepActive: { backgroundColor: "#000000" },
  progressText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  progressTextActive: { color: "#FFFFFF" },
  progressLine: {
    width: 24,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  stepContainer: { gap: 20 },
  section: { marginBottom: 4 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buttonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  typeButtonActive: { backgroundColor: "#000000", borderColor: "#000000" },
  typeButtonText: { fontSize: 14, fontWeight: "600", color: "#9CA3AF" },
  typeButtonTextActive: { color: "#FFFFFF" },
  thumbnailContainer: {
    width: "100%",
    height: 180,
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnailImage: { width: "100%", height: "100%" },
  uploadIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  uploadText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  uploadSubtext: { fontSize: 10, color: "#9CA3AF", marginTop: 4 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  categoryButtonActive: { backgroundColor: "#000000", borderColor: "#000000" },
  categoryButtonText: { fontSize: 14, fontWeight: "600", color: "#9CA3AF" },
  categoryButtonTextActive: { color: "#FFFFFF" },
  stepTitle: { fontSize: 24, fontWeight: "900", color: "#111827" },
  stepSubTitle: { fontSize: 14, color: "#6B7280", marginBottom: 10 },
  moduleCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  moduleInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  moduleNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  moduleNumberText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  moduleTitle: { fontSize: 18, fontWeight: "800", color: "#111827", flex: 1 },
  lessonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  lessonLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  lessonInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
  },
  previewToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  previewText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    marginLeft: 8,
  },
  previewTextActive: { color: "#FF4D00" },
  addLessonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  addLessonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 8,
  },
  addModuleContainer: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#E2E8F0",
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  addModuleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  addModuleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#10B981",
    marginLeft: 8,
  },
  actionContainer: { marginTop: 24, gap: 12 },
  multiActionContainer: { flexDirection: "row", gap: 12 },
  primaryButton: {
    backgroundColor: "#000",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: { backgroundColor: "#D1D5DB" },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#374151", fontSize: 16, fontWeight: "700" },
  cancelButton: { padding: 16, alignItems: "center" },
  cancelButtonText: { color: "#9CA3AF", fontSize: 14, fontWeight: "700" },
});
