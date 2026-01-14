import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const CATEGORIES = ["Digital", "Physical", "Services"];

export default function CreateService() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Digital");

  const handleCreate = () => {
    // Logic for creating service would go here
    console.log("Creating service:", { title, price, description, category });
    router.back();
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Create Service",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>
          ),
          headerTitleStyle: {
            fontFamily: "System",
            fontWeight: "900",
          },
        }}
      />
      <StatusBar style="dark" />

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-1">
          Service Details
        </Text>

        {/* Image Upload Placeholder */}
        <TouchableOpacity className="w-full h-48 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 items-center justify-center mb-8">
          <View className="w-12 h-12 rounded-full bg-white shadow-sm items-center justify-center mb-2">
            <Ionicons name="camera-outline" size={24} color="#FF4D00" />
          </View>
          <Text className="text-gray-400 font-bold text-sm">
            Upload Service Cover
          </Text>
          <Text className="text-gray-300 text-[10px] mt-1">
            PNG, JPG up to 10MB
          </Text>
        </TouchableOpacity>

        <View className="space-y-6">
          <Input
            label="Service Title"
            placeholder="e.g. Premium UI Kit"
            value={title}
            onChangeText={setTitle}
          />

          <View className="mb-6">
            <Text className="text-sm font-bold text-gray-700 mb-3 px-1">
              Category
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-6 py-3 rounded-2xl border ${
                    category === cat
                      ? "bg-black border-black"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`font-bold text-sm ${
                      category === cat ? "text-white" : "text-gray-400"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Price ($)"
            placeholder="0.00"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />

          <View className="mb-8">
            <Text className="text-sm font-bold text-gray-700 mb-3 px-1">
              Description
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="Tell your audience about this service..."
              value={description}
              onChangeText={setDescription}
              className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-black font-medium min-h-[120px]"
              textAlignVertical="top"
            />
          </View>
        </View>

        <View className="mt-4 mb-12">
          <Button
            title="Publish Service"
            onPress={handleCreate}
            variant="brand"
          />
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 py-4 items-center"
          >
            <Text className="text-gray-400 font-bold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
