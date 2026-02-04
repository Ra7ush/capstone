import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInRight } from "react-native-reanimated";

const BENEFITS = [
  {
    icon: "infinite",
    title: "Unlimited Courses",
    description:
      "Publish as many courses and services as you want without any restrictions.",
    color: "#FF4D00",
  },
  {
    icon: "trending-down",
    title: "Lower Platform Fees",
    description:
      "Enjoy a reduced commission rate of just 5% on all your sales.",
    color: "#3B82F6",
  },
  {
    icon: "shield-checkmark",
    title: "Priority Support",
    description:
      "Get dedicated 24/7 support from our specialist creator success team.",
    color: "#10B981",
  },
  {
    icon: "analytics",
    title: "Advanced Analytics",
    description:
      "Deep insights into student behavior and detailed revenue reports.",
    color: "#A855F7",
  },
];

const PRICING = {
  monthly: {
    price: "19,000",
    label: "per month",
  },
  yearly: {
    price: "149,000",
    label: "per year",
    savings: "Save 79,000 IQD",
  },
};

export default function SubscriptionUpgrade() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);

  const currentPrice = isYearly ? PRICING.yearly : PRICING.monthly;

  const handleSubscribe = () => {
    Alert.alert(
      "Subscribe to Pro",
      `You are about to subscribe to the ${isYearly ? "Annual" : "Monthly"} Pro Plan. Payment gateway integration coming soon!`,
      [{ text: "Great!", style: "default" }],
    );
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView className="flex-1">
        <View className="flex-1">
          {/* Header */}
          <View className="px-6 py-4 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <View className="bg-[#FF4D00] px-4 py-1 rounded-full">
              <Text className="text-white font-black text-[10px] uppercase">
                Nexus Pro
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            {/* Hero Section */}
            <View className="px-6 pt-8 pb-12 items-center">
              <Animated.View entering={FadeInUp.delay(200)}>
                <Text className="text-white text-5xl font-black italic tracking-tighter text-center leading-[50px]">
                  Unleash Your<Text className="text-[#FF4D00]"> Potential</Text>
                </Text>
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(300)}>
                <Text className="text-gray-400 font-bold text-center mt-4 leading-6">
                  Upgrade to Nexus Pro and get the tools you need to build and
                  scale your digital empire.
                </Text>
              </Animated.View>

              {/* Toggle */}
              <View className="flex-row bg-white/5 p-1 rounded-2xl mt-12 border border-white/10">
                <TouchableOpacity
                  onPress={() => setIsYearly(false)}
                  className={`px-8 py-3 rounded-xl ${!isYearly ? "bg-white" : ""}`}
                >
                  <Text
                    className={`font-black uppercase text-[10px] ${!isYearly ? "text-black" : "text-gray-400"}`}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsYearly(true)}
                  className={`px-8 py-3 rounded-xl ${isYearly ? "bg-white" : ""}`}
                >
                  <Text
                    className={`font-black uppercase text-[10px] ${isYearly ? "text-black" : "text-gray-400"}`}
                  >
                    Yearly
                  </Text>
                </TouchableOpacity>
              </View>

              {isYearly && (
                <View className="mt-4 bg-[#FF4D00]/20 px-4 py-1 rounded-full border border-[#FF4D00]/30">
                  <Text className="text-[#FF4D00] font-black text-[10px] uppercase">
                    {PRICING.yearly.savings}
                  </Text>
                </View>
              )}
            </View>

            {/* Price Display */}
            <View className="px-6 mb-12">
              <View className="bg-white/5 rounded-[3rem] p-8 border border-white/10 items-center">
                <Text className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-2">
                  Starting At
                </Text>
                <View className="flex-row items-baseline">
                  <Text className="text-white text-6xl font-black italic tracking-tighter">
                    {currentPrice.price}
                  </Text>
                  <Text className="text-white font-black text-xl ml-2">
                    IQD
                  </Text>
                </View>
                <Text className="text-gray-500 font-bold mt-2 uppercase tracking-widest text-[10px]">
                  {currentPrice.label}
                </Text>
              </View>
            </View>

            {/* Benefits List */}
            <View className="px-6 gap-4">
              <Text className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-2 px-2">
                Pro Features
              </Text>
              {BENEFITS.map((benefit, index) => (
                <Animated.View
                  key={index}
                  entering={FadeInRight.delay(400 + index * 100)}
                  className="flex-row bg-white/5 p-5 rounded-[2.5rem] border border-white/10 items-center"
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: `${benefit.color}15` }}
                  >
                    <Ionicons
                      name={benefit.icon as any}
                      size={24}
                      color={benefit.color}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-black text-lg">
                      {benefit.title}
                    </Text>
                    <Text className="text-gray-500 font-bold text-xs mt-1 leading-5">
                      {benefit.description}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Bottom CTA */}
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-md border-t border-white/10">
          <TouchableOpacity
            onPress={handleSubscribe}
            className="bg-[#FF4D00] py-5 rounded-[2rem] items-center shadow-xl shadow-[#FF4D00]/20"
          >
            <Text className="text-white font-black text-lg uppercase tracking-widest">
              Upgrade to Pro
            </Text>
          </TouchableOpacity>
          <Text className="text-gray-500 text-[10px] font-bold text-center mt-4 uppercase">
            Cancel anytime. Secure payment processing.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
