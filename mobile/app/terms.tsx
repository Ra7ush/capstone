import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

const LEGAL_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content:
      "By accessing or using the Nexus Protocol, you agree to be bound by these Terms of Service. If you do not agree to all terms, you must immediately terminate all sessions and disconnect your identity node.",
  },
  {
    title: "2. Creator Intellectual Property",
    content:
      "Creators retain all primary rights to their original content nodes. However, by publishing on the Nexus Protocol, creators grant the protocol a non-exclusive, global license to distribute and process content for educational purposes.",
  },
  {
    title: "3. Payment & Arbitrations",
    content:
      "All transactions are processed through the Nexus Secure Treasury. Disputes are subject to digital arbitration within the protocol. Fees are non-refundable once content access has been cryptographically unlocked.",
  },
  {
    title: "4. Data Governance",
    content:
      "Your data is managed according to the Nexus Privacy Protocol. We do not sell identity parameters. Anonymous usage logs may be utilized for protocol optimization and algorithm refinement.",
  },
  {
    title: "5. Limitation of Liability",
    content:
      "The Nexus Protocol is provided 'as-is'. We are not liable for knowledge inaccuracies, financial fluctuations, or temporary infrastructure synchronization failures.",
  },
];

export default function TermsOfService() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "TERMS OF SERVICE",
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
          <View className="mb-10">
            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">
              Last Synchronized: January 2026
            </Text>
            <Text className="text-black font-black text-3xl leading-tight">
              Nexus Protocol{"\n"}Legal Framework
            </Text>
          </View>

          {LEGAL_SECTIONS.map((section, index) => (
            <View key={index} className="mb-10">
              <View className="flex-row items-center mb-4">
                <View className="w-1 h-6 bg-[#FF4D00] mr-4 rounded-full" />
                <Text className="text-black font-black uppercase text-xs tracking-widest">
                  {section.title}
                </Text>
              </View>
              <Text className="text-gray-500 text-sm font-medium leading-7 ml-5">
                {section.content}
              </Text>
            </View>
          ))}

          <View className="bg-gray-50 rounded-[2.5rem] p-8 mb-8 border border-gray-100">
            <View className="flex-row items-center mb-4">
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="black"
              />
              <Text className="text-black font-black uppercase text-xs tracking-widest ml-2">
                Compliance Node
              </Text>
            </View>
            <Text className="text-gray-400 text-[10px] font-bold leading-5 uppercase mb-6">
              Failure to comply with protocol governance may result in permanent
              identity termination and ledger forfeiture.
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-black py-4 rounded-[1.5rem] items-center"
            >
              <Text className="text-white font-black uppercase text-xs tracking-widest">
                Confirm & Return
              </Text>
            </TouchableOpacity>
          </View>

          <View className="items-center mb-8">
            <Text className="text-gray-300 text-[10px] font-black uppercase tracking-widest">
              Nexus Protocol Governance v4.2.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
