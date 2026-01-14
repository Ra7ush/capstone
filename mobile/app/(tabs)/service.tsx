import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

const CATEGORIES = ["All", "Digital", "Physical", "Services"];

const MOCK_SERVICES = [
  {
    id: "1",
    title: "Premium UI Kit - Nexus Edition",
    category: "Digital",
    price: 49,
    sales: 124,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=60",
    status: "Active",
  },
  {
    id: "2",
    title: "1-on-1 Design Consultation",
    category: "Services",
    price: 150,
    sales: 42,
    rating: 5.0,
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60",
    status: "Active",
  },
  {
    id: "3",
    title: "Custom 3D Icon Set",
    category: "Digital",
    price: 29,
    sales: 89,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=60",
    status: "Draft",
  },
  {
    id: "4",
    title: "Modern Minimalist Poster",
    category: "Physical",
    price: 35,
    sales: 56,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=60",
    status: "Active",
  },
];

export default function Service() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filteredServices = MOCK_SERVICES.filter((service) => {
    const matchesCategory =
      activeCategory === "All" || service.category === activeCategory;
    const matchesSearch = service.title
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 pt-16 pb-4 bg-white">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-black text-black">Services</Text>
          <TouchableOpacity
            onPress={() => router.push("/service-create")}
            className="bg-black px-4 py-2 rounded-full flex-row items-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-black text-sm ml-1">Add New</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="bg-gray-50 flex-row items-center px-4 py-3 rounded-2xl border border-gray-100 mb-6">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Search your services..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-black font-medium"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row gap-2"
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full border ${
                activeCategory === cat
                  ? "bg-black border-black"
                  : "bg-white border-gray-100"
              } mr-2`}
            >
              <Text
                className={`font-black text-[10px] uppercase tracking-widest ${
                  activeCategory === cat ? "text-white" : "text-gray-400"
                }`}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Service Grid */}
        <View className="px-6 py-4 flex-row flex-wrap justify-between">
          {filteredServices.map((service) => (
            <TouchableOpacity key={service.id} className="w-[48%] mb-8">
              {/* Image Container */}
              <View className="w-full h-40 rounded-[2rem] overflow-hidden border border-gray-100 mb-3 bg-gray-50">
                <Image
                  source={{ uri: service.image }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <View className="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded-full border border-gray-100">
                  <Text className="text-black font-black text-[10px]">
                    ${service.price}
                  </Text>
                </View>
                {service.status === "Draft" && (
                  <View className="absolute top-3 left-3 bg-gray-800 px-2 py-1 rounded-full">
                    <Text className="text-white font-black text-[10px] uppercase">
                      Draft
                    </Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <Text
                className="text-black font-black text-sm mb-1"
                numberOfLines={1}
              >
                {service.title}
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text className="text-gray-400 text-[10px] font-bold ml-1">
                    {service.rating}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="cart-outline" size={12} color="#9CA3AF" />
                  <Text className="text-gray-400 text-[10px] font-bold ml-1">
                    {service.sales} sales
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredServices.length === 0 && (
            <View className="w-full items-center justify-center py-20">
              <View className="w-20 h-20 rounded-full bg-gray-50 items-center justify-center mb-4">
                <Ionicons name="cube-outline" size={32} color="#D1D5DB" />
              </View>
              <Text className="text-gray-400 font-bold">No services found</Text>
            </View>
          )}
        </View>

        {/* Global Performance Summary */}
        <View className="mx-6 mb-12 bg-black rounded-[2.5rem] p-6 shadow-xl shadow-black/20">
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">
            Store Performance
          </Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-white text-2xl font-black">$3,420</Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase">
                Revenue
              </Text>
            </View>
            <View>
              <Text className="text-white text-2xl font-black">311</Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase">
                Total Sales
              </Text>
            </View>
            <View>
              <Text className="text-white text-2xl font-black">4.9</Text>
              <Text className="text-gray-500 text-[10px] font-black uppercase">
                Avg Rating
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
