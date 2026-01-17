import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CommunityCreationModal } from "./CommunityCreationModal";
import { Community as CommunityType } from "../../hooks/useCommunity";

interface CreatorOnboardingProps {
  onCreate: (data: any) => Promise<any>;
  uploadImage: (uri: string) => Promise<string>;
  onSuccess: (community: CommunityType) => void;
}

export const CreatorOnboarding = ({
  onCreate,
  uploadImage,
  onSuccess,
}: CreatorOnboardingProps) => {
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);

  return (
    <View className="flex-1 items-center justify-center px-8 bg-white">
      <View className="w-24 h-24 rounded-full bg-black items-center justify-center mb-8">
        <Ionicons name="people" size={40} color="white" />
      </View>
      <Text className="text-3xl font-black text-center mb-4 text-black">
        Create Your Community
      </Text>
      <Text className="text-gray-400 font-medium text-center mb-8 leading-6">
        As a creator, you need to set up your community first. This is where
        your fans will connect with you.
      </Text>
      <TouchableOpacity
        className="bg-black px-10 py-4 rounded-full"
        onPress={() => setIsCreatingCommunity(true)}
      >
        <Text className="text-white font-black text-lg">Get Started</Text>
      </TouchableOpacity>

      <CommunityCreationModal
        visible={isCreatingCommunity}
        onClose={() => setIsCreatingCommunity(false)}
        onCreate={onCreate}
        uploadImage={uploadImage}
        onSuccess={onSuccess}
      />
    </View>
  );
};
