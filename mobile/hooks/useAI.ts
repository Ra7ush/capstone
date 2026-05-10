import { useQuery, useMutation } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";

// ============================================
// 1. AI Course Recommendations (lazy — call refetch() to trigger)
// ============================================
export function useAIRecommendations() {
  return useQuery({
    queryKey: ["ai", "recommendations"],
    queryFn: async () => {
      const res = await aiApi.getRecommendations();
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: false, // Don't auto-retry to save quota
    enabled: false, // ← Lazy: won't fire until refetch() is called
  });
}

// ============================================
// 2. AI Chat Tutor
// ============================================
export function useAIChatTutor() {
  return useMutation({
    mutationFn: (data: {
      message: string;
      courseTitle?: string;
      courseDescription?: string;
      lessonTitle?: string;
      history?: { role: string; content: string }[];
    }) => aiApi.chat(data),
  });
}

// ============================================
// 2b. General AI Chat (My AI — Snapchat-style)
// ============================================
export function useAIChat() {
  return useMutation({
    mutationFn: (data: {
      message: string;
      history?: { role: string; content: string }[];
    }) => aiApi.chat(data),
  });
}

// ============================================
// 3. AI Course Description Generator
// ============================================
export function useAIGenerateDescription() {
  return useMutation({
    mutationFn: (data: {
      title: string;
      category?: string;
      keywords?: string;
    }) => aiApi.generateDescription(data),
  });
}

// ============================================
// 4. AI Smart Search
// ============================================
export function useAISmartSearch() {
  return useMutation({
    mutationFn: (query: string) => aiApi.smartSearch(query),
  });
}

// ============================================
// 5. AI Content Summarizer
// ============================================
export function useAISummarize() {
  return useMutation({
    mutationFn: ({
      content,
      type,
    }: {
      content: string;
      type?: "course" | "post";
    }) => aiApi.summarize(content, type),
  });
}
