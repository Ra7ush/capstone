import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAIChatTutor } from "@/hooks/useAI";

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  courseTitle?: string;
  courseDescription?: string;
  lessonTitle?: string;
}

export default function AIChatModal({
  visible,
  onClose,
  courseTitle,
  courseDescription,
  lessonTitle,
}: AIChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const chatMutation = useAIChatTutor();

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");

    try {
      const res = await chatMutation.mutateAsync({
        message: text,
        courseTitle,
        courseDescription,
        lessonTitle,
        history: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const aiMsg: ChatMessage = {
        role: "model",
        content: res.data.reply,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "Sorry, I couldn\u2019t respond. Please try again.",
        },
      ]);
    }

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleClose = () => {
    setMessages([]);
    setInput("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-14 pb-4 border-b border-gray-100">
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-full bg-purple-100 items-center justify-center mr-3">
              <Ionicons name="sparkles" size={18} color="#7C3AED" />
            </View>
            <View>
              <Text className="text-base font-black text-black">AI Tutor</Text>
              <Text className="text-[11px] text-gray-400 font-medium">
                {courseTitle
                  ? `Helping with: ${courseTitle.slice(0, 30)}${courseTitle.length > 30 ? "..." : ""}`
                  : "Ask me anything"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 && (
            <View className="items-center py-16">
              <View className="w-16 h-16 rounded-full bg-purple-50 items-center justify-center mb-4">
                <Ionicons name="sparkles" size={32} color="#7C3AED" />
              </View>
              <Text className="text-lg font-black text-black mb-2">
                Hi! I&apos;m your AI Tutor
              </Text>
              <Text className="text-gray-400 text-sm text-center px-8">
                Ask me anything about the course content. I&apos;m here to help
                you learn!
              </Text>
              <View className="mt-6 gap-2 w-full">
                {[
                  "Explain the key concepts",
                  "Give me a practice exercise",
                  "Summarize this lesson",
                ].map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    className="bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100"
                    onPress={() => {
                      setInput(suggestion);
                    }}
                  >
                    <Text className="text-gray-600 text-sm font-medium">
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, i) => (
            <View
              key={i}
              className={`mb-3 max-w-[85%] ${msg.role === "user" ? "self-end" : "self-start"}`}
            >
              <View
                className={`px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-black rounded-br-sm"
                    : "bg-gray-100 rounded-bl-sm"
                }`}
              >
                <Text
                  className={`text-sm leading-5 ${
                    msg.role === "user" ? "text-white" : "text-black"
                  }`}
                >
                  {msg.content}
                </Text>
              </View>
              <Text
                className={`text-[10px] text-gray-400 mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}
              >
                {msg.role === "user" ? "You" : "AI Tutor"}
              </Text>
            </View>
          ))}

          {chatMutation.isPending && (
            <View className="self-start mb-3 max-w-[85%]">
              <View className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text className="text-gray-400 text-sm">Thinking...</Text>
                </View>
              </View>
            </View>
          )}

          <View className="h-4" />
        </ScrollView>

        {/* Input */}
        <View className="px-5 py-3 border-t border-gray-100 pb-8">
          <View className="flex-row items-end bg-gray-50 rounded-2xl border border-gray-100 px-4 py-2">
            <TextInput
              className="flex-1 text-black text-sm max-h-24 py-2"
              placeholder="Ask a question..."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              className={`w-9 h-9 rounded-full items-center justify-center ml-2 ${
                input.trim() && !chatMutation.isPending
                  ? "bg-black"
                  : "bg-gray-200"
              }`}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={
                  input.trim() && !chatMutation.isPending ? "white" : "#9CA3AF"
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
