import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAIChat } from "@/hooks/useAI";
import { LinearGradient } from "expo-linear-gradient";
import { mmkvStorageAsync } from "@/lib/storage";

const AI_CHAT_STORAGE_KEY = "my_ai_chat_history";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "What should I learn today?",
  "Help me with a coding problem",
  "Give me study tips",
  "Explain something complex simply",
  "Recommend me a learning path",
];

export default function AIChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const chatMutation = useAIChat();

  // Load chat history from storage on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await mmkvStorageAsync.getItem(AI_CHAT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Restore Date objects from strings
          const restored = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(restored);
        }
      } catch (e) {
        console.error("Failed to load AI chat history:", e);
      } finally {
        setLoaded(true);
      }
    };
    loadHistory();
  }, []);

  // Save chat history to storage whenever messages change
  useEffect(() => {
    if (!loaded) return; // Don't save before initial load
    const saveHistory = async () => {
      try {
        await mmkvStorageAsync.setItem(
          AI_CHAT_STORAGE_KEY,
          JSON.stringify(messages),
        );
      } catch (e) {
        console.error("Failed to save AI chat history:", e);
      }
    };
    saveHistory();
  }, [messages, loaded]);

  const handleSend = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || chatMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msgText,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    Keyboard.dismiss();

    try {
      const res = await chatMutation.mutateAsync({
        message: msgText,
        history: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: res.data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Oops! I couldn\u2019t respond right now. Please try again 😅",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleClearChat = useCallback(() => {
    Alert.alert("Clear Chat", "Delete all messages with My AI?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          setMessages([]);
          await mmkvStorageAsync.removeItem(AI_CHAT_STORAGE_KEY);
        },
      },
    ]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        150,
      );
    }
  }, [messages.length]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";

    return (
      <View className={`px-5 mb-3 ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <View className="flex-row items-center mb-1.5">
            <LinearGradient
              colors={["#7C3AED", "#6D28D9"]}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 6,
              }}
            >
              <Ionicons name="sparkles" size={12} color="white" />
            </LinearGradient>
            <Text className="text-[11px] text-gray-400 font-bold">My AI</Text>
          </View>
        )}
        <View
          className={`max-w-[82%] px-4 py-3 ${
            isUser
              ? "bg-black rounded-2xl rounded-br-md"
              : "bg-gray-100 rounded-2xl rounded-bl-md"
          }`}
        >
          <Text
            className={`text-[15px] leading-[22px] ${
              isUser ? "text-white" : "text-black"
            }`}
          >
            {item.content}
          </Text>
        </View>
        <Text className="text-[10px] text-gray-300 mt-1 px-1">
          {formatTime(item.timestamp)}
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8">
      {/* AI Avatar */}
      <LinearGradient
        colors={["#7C3AED", "#9333EA", "#6D28D9"]}
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Ionicons name="sparkles" size={36} color="white" />
      </LinearGradient>

      <Text className="text-xl font-black text-black mb-2">My AI</Text>
      <Text className="text-gray-400 text-sm text-center leading-5 mb-8">
        Hey! I&apos;m your personal AI assistant.{"\n"}Ask me anything —
        I&apos;m here to help! 🚀
      </Text>

      {/* Suggestion chips */}
      <View className="w-full gap-2.5">
        {SUGGESTIONS.map((suggestion) => (
          <TouchableOpacity
            key={suggestion}
            className="bg-purple-50 border border-purple-100 px-4 py-3.5 rounded-2xl flex-row items-center"
            onPress={() => handleSend(suggestion)}
            disabled={chatMutation.isPending}
          >
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color="#7C3AED"
              style={{ marginRight: 10 }}
            />
            <Text className="text-purple-700 text-[14px] font-semibold flex-1">
              {suggestion}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#7C3AED" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header */}
      <View
        className="bg-white border-b border-gray-100 px-4 pb-3 flex-row items-center"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3"
        >
          <Ionicons name="chevron-back" size={22} color="black" />
        </TouchableOpacity>

        <LinearGradient
          colors={["#7C3AED", "#9333EA"]}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="sparkles" size={18} color="white" />
        </LinearGradient>

        <View className="flex-1">
          <Text className="text-[16px] font-black text-black">My AI</Text>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
            <Text className="text-[12px] text-gray-400 font-medium">
              Always online
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleClearChat}
          className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListFooterComponent={
              chatMutation.isPending ? (
                <View className="px-5 mb-3 items-start">
                  <View className="flex-row items-center mb-1.5">
                    <LinearGradient
                      colors={["#7C3AED", "#6D28D9"]}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 6,
                      }}
                    >
                      <Ionicons name="sparkles" size={12} color="white" />
                    </LinearGradient>
                    <Text className="text-[11px] text-gray-400 font-bold">
                      My AI
                    </Text>
                  </View>
                  <View className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator size="small" color="#7C3AED" />
                      <Text className="text-gray-400 text-[13px] font-medium">
                        Thinking...
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* Input Bar */}
        <View
          className="px-4 py-3 border-t border-gray-100 bg-white"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="flex-row items-end bg-gray-50 rounded-2xl border border-gray-200 pl-4 pr-2 py-1.5">
            <TextInput
              className="flex-1 text-black text-[15px] max-h-24 py-2"
              placeholder="Message My AI..."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
              returnKeyType="default"
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!input.trim() || chatMutation.isPending}
              style={{ marginBottom: 4 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor:
                    input.trim() && !chatMutation.isPending
                      ? "#7C3AED"
                      : "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={
                    input.trim() && !chatMutation.isPending
                      ? "white"
                      : "#9CA3AF"
                  }
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
