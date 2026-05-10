import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthState } from "@/hooks/useAuthState";
import { useUser, useUpdateProfile } from "@/hooks/useProfile";
import { useBlockedUsers } from "@/hooks/useBlocking";
import { Input, Button } from "@/components/ui";
import * as Linking from "expo-linking";
import { useRef, useEffect } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";

export default function Security() {
  const router = useRouter();
  const { user } = useAuthState();

  const { data: profile } = useUser();
  const { data: blockedUsers } = useBlockedUsers();
  const updateProfileMutation = useUpdateProfile();
  const { reset } = useLocalSearchParams();

  // Handle password reset deep link
  useEffect(() => {
    if (reset === "true") {
      setIsPasswordModalVisible(true);
      router.setParams({ reset: undefined });
    }
  }, [reset]);

  // Email Update State
  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Password Reset State
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Animation States (copied for consistency)
  const screenHeight = Dimensions.get("window").height;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Sync animation with email modal
  useEffect(() => {
    if (isEmailModalVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }),
      ]).start();
    }
  }, [isEmailModalVisible]);

  const handleCloseEmailModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsEmailModalVisible(false);
      setNewEmail("");
      setEmailError("");
    });
  };

  const currentEmail = user?.email || "No email linked";

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setIsUpdatingEmail(true);
    setEmailError("");
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      Alert.alert(
        "Verification Required",
        "A confirmation link has been sent to your new email address.",
        [{ text: "Done", onPress: handleCloseEmailModal }],
      );
    } catch (error: any) {
      setEmailError(error.message || "Failed to update email address");
    } finally {
      setIsUpdatingEmail(false);
    }
  };


  const handleChangePassword = async () => {
    if (user?.email) {
      const redirectUrl = Linking.createURL("/security", {
        queryParams: { reset: "true" },
      });
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: redirectUrl,
      });
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert(
          "Request Sent",
          "A password reset link has been sent to your email.",
        );
      }
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "EXTREME CAUTION",
      "This action is irreversible. All your data, services, and earnings will be permanently deleted from the Nexus Protocol.",
      [
        { text: "Abort", style: "cancel" },
        {
          text: "DELETE FOREVER",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "To proceed, please contact support at support@nexus.io to verify your identity before account termination.",
            );
          },
        },
      ],
    );
  };

  const renderToggle = (
    icon: any,
    label: string,
    description: string,
    value: boolean,
    onValueChange: (val: boolean) => void,
  ) => (
    <View className="flex-row items-center justify-between mb-6 bg-gray-50 p-5 rounded-[2rem] border border-gray-100">
      <View className="flex-1 mr-4">
        <View className="flex-row items-center mb-1">
          <Ionicons name={icon} size={18} color="black" />
          <Text className="text-black font-black uppercase text-xs ml-2 tracking-widest">
            {label}
          </Text>
        </View>
        <Text className="text-gray-400 text-[10px] font-bold leading-4">
          {description}
        </Text>
      </View>
      <Switch
        trackColor={{ false: "#E5E7EB", true: "#000" }}
        thumbColor={value ? "#FF4D00" : "#F3F4F6"}
        ios_backgroundColor="#E5E7EB"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

  const renderAction = (
    icon: any,
    label: string,
    onPress: () => void,
    variant: "default" | "danger" = "default",
  ) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between p-5 rounded-[2rem] mb-4 border ${
        variant === "danger"
          ? "bg-red-50 border-red-100"
          : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      <View className="flex-row items-center">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            variant === "danger" ? "bg-red-100" : "bg-gray-50"
          }`}
        >
          <Ionicons
            name={icon}
            size={20}
            color={variant === "danger" ? "#EF4444" : "black"}
          />
        </View>
        <Text
          className={`font-black uppercase text-xs tracking-widest ${
            variant === "danger" ? "text-red-500" : "text-black"
          }`}
        >
          {label}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={variant === "danger" ? "#EF4444" : "#D1D5DB"}
      />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "PRIVACY & SECURITY",
          headerTitleStyle: {
            fontWeight: "900",
            fontSize: 12,
          },
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
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">
              Nexus Privacy Protocol
            </Text>
            {renderToggle(
              "eye-outline",
              "Public Profile",
              "Control whether your profile is discoverable in global search results.",
              profile?.is_public ?? true,
              (val) => updateProfileMutation.mutate({ is_public: val }),
            )}
            {renderAction(
              "ban-outline",
              `Blocked Creators (${blockedUsers?.length || 0})`,
              () => router.push("/blocked-users"),
            )}
          </View>

          <View className="mb-10">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">
              Cryptographical Security
            </Text>
            {renderAction("mail-outline", "Update Email Identity", () =>
              setIsEmailModalVisible(true),
            )}
            {renderAction(
              "key-outline",
              "Change Access Password",
              handleChangePassword,
            )}

            <TouchableOpacity
              onPress={() => router.push("/mfa-setup")}
              className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color="black"
                  />
                  <Text className="text-black font-black uppercase text-xs ml-2 tracking-widest">
                    Two-Factor (2FA)
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${user?.mfa_enabled ? "bg-black" : "bg-gray-200"}`}
                >
                  <Text
                    className={`text-[10px] font-black uppercase ${user?.mfa_enabled ? "text-white" : "text-gray-500"}`}
                  >
                    {user?.mfa_enabled ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-400 text-[10px] font-bold mt-2 leading-relaxed">
                Enhanced protection via authenticator apps. Secure your account
                nodes.
              </Text>
            </TouchableOpacity>
          </View>

          {/* Account Management */}
          <View className="mb-8">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">
              Protocol Governance
            </Text>
            {renderAction(
              "trash-outline",
              "Terminate Account Ledger",
              handleDeleteAccount,
              "danger",
            )}
          </View>

          <View className="items-center mt-4">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed" size={12} color="#D1D5DB" />
              <Text className="text-gray-300 text-[10px] font-black uppercase tracking-widest ml-1">
                Secure Encryption End-to-End
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Email Change Modal */}
      <Modal
        visible={isEmailModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={handleCloseEmailModal}
      >
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="absolute inset-0 bg-black/60"
        >
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={handleCloseEmailModal}
          />
        </Animated.View>

        <Animated.View
          style={{
            height: "100%",
            justifyContent: "flex-end",
            transform: [{ translateY: slideAnim }],
          }}
          pointerEvents="box-none"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-white rounded-t-[3rem]"
          >
            <View className="items-center py-4 border-b border-gray-100">
              <View className="w-10 h-1 bg-gray-200 rounded-full mb-2" />
              <Text className="font-black uppercase tracking-widest text-[10px] text-gray-400">
                Security Protocol
              </Text>
            </View>

            <View className="p-8 pb-12">
              <View className="flex-row items-center justify-between mb-8">
                <View>
                  <Text className="text-3xl font-black italic">
                    Change<Text className="text-[#FF4D00]">Email</Text>
                  </Text>
                  <Text className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1 text-left">
                    Identity Synchronizer
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCloseEmailModal}
                  className="bg-gray-100 p-2 rounded-full"
                >
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
              </View>

              <View className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 mb-8">
                <Text className="text-gray-500 text-[10px] font-black uppercase mb-3 ml-2">
                  Current Identity Node
                </Text>
                <Text className="text-black font-bold text-lg ml-2 mb-6">
                  {currentEmail}
                </Text>

                <Input
                  label="New Email Address"
                  placeholder="Enter new email address"
                  value={newEmail}
                  onChangeText={(val) => {
                    setNewEmail(val);
                    setEmailError("");
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  icon="mail-outline"
                  error={emailError}
                />
              </View>

              <View className="gap-4">
                <Button
                  title="Synchronize Identity"
                  onPress={handleUpdateEmail}
                  loading={isUpdatingEmail}
                  variant="brand"
                  className="py-5"
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        visible={isPasswordModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
        >
          <View className="flex-1 px-8 pt-8">
            <View className="flex-row items-center justify-between mb-8">
              <View>
                <Text className="text-3xl font-black italic">
                  New<Text className="text-[#FF4D00]"> Credentials</Text>
                </Text>
                <Text className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1 text-left">
                  Secure Access Protocol
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPasswordModalVisible(false)}
                className="bg-gray-100 p-2 rounded-full"
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <View className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 mb-8 gap-4">
              <Input
                label="New Password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                icon="lock-closed-outline"
                error={passwordError}
              />
              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                icon="shield-checkmark-outline"
              />
            </View>

            <Button
              title="Update Password"
              onPress={async () => {
                if (!newPassword || newPassword.length < 6) {
                  setPasswordError("Password must be at least 6 characters");
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setPasswordError("Passwords do not match");
                  return;
                }
                setIsUpdatingPassword(true);
                setPasswordError("");
                try {
                  const { error } = await supabase.auth.updateUser({
                    password: newPassword,
                  });
                  if (error) throw error;
                  Alert.alert(
                    "Success",
                    "Your password has been updated securely.",
                    [
                      {
                        text: "Done",
                        onPress: () => setIsPasswordModalVisible(false),
                      },
                    ],
                  );
                } catch (error: any) {
                  setPasswordError(error.message);
                } finally {
                  setIsUpdatingPassword(false);
                }
              }}
              loading={isUpdatingPassword}
              variant="brand"
              className="py-5"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
