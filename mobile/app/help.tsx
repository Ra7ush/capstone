import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

const CATEGORIES = [
  { id: "payments", icon: "card-outline", label: "Payments", color: "#3B82F6" },
  { id: "creator", icon: "school-outline", label: "Creator", color: "#FF4D00" },
  { id: "sync", icon: "sync-outline", label: "Account Sync", color: "#10B981" },
  {
    id: "legal",
    icon: "document-text-outline",
    label: "Legal",
    color: "#6B7280",
  },
];

const FAQS = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I become a creator?",
        a: "You can apply through the 'Verification Status' section in your profile. You'll need to provide a portfolio and ID for review.",
      },
      {
        q: "What is the Nexus Protocol?",
        a: "Nexus is a decentralized knowledge exchange protocol where creators can monetize their expertise through structured courses and services.",
      },
    ],
  },
  {
    category: "Monetization",
    questions: [
      {
        q: "When do I get paid?",
        a: "Earnings are cleared 7 days after a service is marked as completed by the student. This handles the protocol's dispute period.",
      },
      {
        q: "What are the fees?",
        a: "The protocol takes a 5% infrastructure fee. 95% goes directly to the creator's wallet.",
      },
    ],
  },
];

export default function HelpCenter() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@nexus.io?subject=Support%20Request");
  };

  const toggleExpand = (id: string) => {
    setExpandedIndex(expandedIndex === id ? null : id);
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "HELP CENTER",
          headerTitleStyle: { fontWeight: "900", fontSize: 12 },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>
          ),
          headerShadowVisible: false,
        }}
      />
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-8">
          {/* Search Bar */}
          <View className="bg-gray-50 rounded-[2rem] p-4 flex-row items-center border border-gray-100 mb-8">
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search features, rewards, protocol..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-3 font-bold text-black"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Quick Categories */}
          <View className="flex-row flex-wrap justify-between mb-10">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.id} className="w-[23%] items-center">
                <View className="w-14 h-14 rounded-2xl items-center justify-center mb-2 bg-gray-50 border border-gray-100">
                  <Ionicons
                    name={cat.icon as any}
                    size={24}
                    color={cat.color}
                  />
                </View>
                <Text className="text-[10px] font-black uppercase text-gray-500 text-center">
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* FAQ Sections */}
          <View className="mb-10">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">
              Frequently Asked Queries
            </Text>

            {FAQS.map((section, sIdx) => (
              <View key={sIdx} className="mb-6">
                <Text className="text-black font-black uppercase text-[10px] mb-4 ml-2 tracking-widest opacity-50">
                  {section.category}
                </Text>
                {section.questions.map((faq, qIdx) => {
                  const id = `${sIdx}-${qIdx}`;
                  const isExpanded = expandedIndex === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => toggleExpand(id)}
                      className="bg-gray-50 rounded-3xl p-5 mb-3 border border-gray-100"
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 text-black font-bold text-sm mr-4">
                          {faq.q}
                        </Text>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color="#9CA3AF"
                        />
                      </View>
                      {isExpanded && (
                        <Text className="text-gray-500 text-xs mt-4 leading-5 font-medium">
                          {faq.a}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Contact Support */}
          <View className="bg-black rounded-[2.5rem] p-8 mb-8">
            <Text className="text-white font-black text-xl mb-2">
              Still need aid?
            </Text>
            <Text className="text-gray-400 text-sm font-medium mb-6">
              Our protocol ambassadors are available 24/7 to solve your complex
              inquiries.
            </Text>

            <TouchableOpacity
              onPress={handleEmailSupport}
              className="bg-[#FF4D00] py-4 rounded-[1.5rem] flex-row items-center justify-center"
            >
              <Ionicons name="mail-outline" size={18} color="white" />
              <Text className="text-white font-black uppercase text-xs ml-2 tracking-widest">
                Initiate Support Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="mt-4 flex-row items-center justify-center py-2">
              <Text className="text-gray-500 font-black uppercase text-[10px] tracking-widest">
                Live Chat:
              </Text>
              <Text className="text-[#10B981] font-black uppercase text-[10px] tracking-widest ml-1">
                Online
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
