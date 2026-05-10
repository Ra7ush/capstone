import { askAI, chatWithAI } from "../lib/openai.js";
import supabase from "../config/db.js";
import { logger } from "../config/logger.js";

/**
 * Check if an error is a rate-limit (429) error.
 */
function isRateLimitError(error) {
  return (
    error?.status === 429 ||
    error?.code === "rate_limit_exceeded" ||
    error?.message?.includes("429") ||
    error?.message?.includes("Too Many Requests") ||
    error?.message?.includes("Rate limit")
  );
}

/**
 * Standard error handler for AI endpoints — returns 429 to frontend when rate-limited.
 */
function handleAIError(res, error, label) {
  logger.error(`${label} error:`, error.message);
  if (isRateLimitError(error)) {
    return res.status(429).json({
      success: false,
      error: "AI rate limit reached. Please wait a minute before trying again.",
    });
  }
  return res
    .status(500)
    .json({ success: false, error: `Failed to ${label.toLowerCase()}` });
}

// ============================================
// 1. AI Course Recommendations
// ============================================
export async function getRecommendations(req, res) {
  try {
    const userId = req.user.id;

    // Get user's purchased courses
    const { data: purchases } = await supabase
      .from("purchases")
      .select("service_id")
      .eq("user_id", userId);

    const purchasedIds = (purchases || []).map((p) => p.service_id);

    // Get details of purchased courses
    let purchasedTitles = [];
    let purchasedCategories = [];
    if (purchasedIds.length > 0) {
      const { data: purchased } = await supabase
        .from("services")
        .select("title, category, description")
        .in("id", purchasedIds);

      purchasedTitles = (purchased || []).map((s) => s.title);
      purchasedCategories = [
        ...new Set((purchased || []).map((s) => s.category).filter(Boolean)),
      ];
    }

    // Get all available published courses (excluding already purchased)
    const query = supabase
      .from("services")
      .select(
        "id, title, description, category, price, thumbnail_url, average_rating, total_reviews, creator_id",
      )
      .eq("status", "published");

    if (purchasedIds.length > 0) {
      query.not("id", "in", `(${purchasedIds.join(",")})`);
    }

    const { data: available } = await query.limit(50);

    if (!available || available.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Build prompt for AI
    const prompt = `You are a course recommendation engine. Based on the user's learning history, rank the available courses by relevance.

USER'S PURCHASED COURSES:
${purchasedTitles.length > 0 ? purchasedTitles.join(", ") : "None yet (new user — recommend popular beginner-friendly courses)"}

USER'S INTERESTED CATEGORIES:
${purchasedCategories.length > 0 ? purchasedCategories.join(", ") : "Unknown"}

AVAILABLE COURSES (JSON):
${JSON.stringify(
  available.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    description: (c.description || "").slice(0, 100),
    rating: c.average_rating,
  })),
)}

Return ONLY a JSON array of course IDs ranked by relevance (most relevant first). Maximum 6 IDs. Example: ["id1","id2","id3"]
Return ONLY the JSON array, no markdown, no explanation.`;

    const response = await askAI(prompt, {
      maxTokens: 256,
      temperature: 0.3,
    });

    // Parse the response to get ordered IDs
    let recommendedIds;
    try {
      const cleaned = response.replace(/```json\n?|```\n?/g, "").trim();
      recommendedIds = JSON.parse(cleaned);
    } catch {
      // Fallback: return top-rated courses
      recommendedIds = available
        .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        .slice(0, 6)
        .map((c) => c.id);
    }

    // Build ordered result
    const courseMap = new Map(available.map((c) => [c.id, c]));
    const recommendations = recommendedIds
      .filter((id) => courseMap.has(id))
      .map((id) => courseMap.get(id));

    return res.json({ success: true, data: recommendations });
  } catch (error) {
    return handleAIError(res, error, "AI Recommendations");
  }
}

// ============================================
// 2. AI Chat Tutor
// ============================================
export async function chatTutor(req, res) {
  try {
    const { message, courseTitle, courseDescription, lessonTitle, history } =
      req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, error: "Message is required" });
    }

    let systemInstruction;

    if (courseTitle) {
      // Course tutor mode
      systemInstruction = `You are a helpful, friendly AI tutor for an online learning platform. You are assisting a student who is taking the course "${courseTitle}".

${courseDescription ? `Course description: ${courseDescription}` : ""}
${lessonTitle ? `The student is currently on the lesson: "${lessonTitle}"` : ""}

Guidelines:
- Give clear, concise explanations
- Use examples when helpful
- If the question is unrelated to the course topic, gently redirect
- Be encouraging and supportive
- Keep responses under 200 words unless a longer explanation is needed
- Format with simple text, avoid complex markdown`;
    } else {
      // General "My AI" assistant mode
      systemInstruction = `You are "My AI", a friendly and helpful AI assistant built into a learning platform's messaging feature. You're like a smart friend the user can chat with anytime.

Guidelines:
- Be conversational, warm, and helpful — like chatting with a knowledgeable friend
- You can help with learning questions, career advice, study tips, coding problems, creative writing, and general knowledge
- Keep responses concise (under 150 words) unless the user asks for detail
- Use a casual, friendly tone but stay informative
- If you don't know something, say so honestly
- Never generate harmful, inappropriate, or misleading content
- Format with simple text, avoid complex markdown
- You can use emojis sparingly to be friendly 😊`;
    }

    const chatHistory = (history || []).map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    const reply = await chatWithAI(chatHistory, message, systemInstruction);

    return res.json({ success: true, data: { reply } });
  } catch (error) {
    return handleAIError(res, error, "AI Chat Tutor");
  }
}

// ============================================
// 3. AI Course Description Generator
// ============================================
export async function generateDescription(req, res) {
  try {
    const { title, category, keywords } = req.body;

    if (!title) {
      return res
        .status(400)
        .json({ success: false, error: "Title is required" });
    }

    const prompt = `You are a course creation assistant for an online learning platform. Generate a compelling course description.

Course Title: "${title}"
${category ? `Category: ${category}` : ""}
${keywords ? `Keywords/Topics: ${keywords}` : ""}

Generate the following in JSON format:
{
  "description": "A compelling 2-3 sentence course description that would attract students",
  "modules": [
    { "title": "Module title", "lessons": ["Lesson 1 title", "Lesson 2 title", "Lesson 3 title"] }
  ]
}

Generate 3-5 modules with 2-4 lessons each. Make it realistic and professional.
Return ONLY valid JSON, no markdown code blocks, no explanation.`;

    const response = await askAI(prompt, {
      maxTokens: 1024,
      temperature: 0.7,
    });

    let parsed;
    try {
      const cleaned = response.replace(/```json\n?|```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res
        .status(500)
        .json({ success: false, error: "Failed to parse AI response" });
    }

    return res.json({ success: true, data: parsed });
  } catch (error) {
    return handleAIError(res, error, "AI Generate Description");
  }
}

// ============================================
// 4. AI Smart Search
// ============================================
export async function smartSearch(req, res) {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 2) {
      return res
        .status(400)
        .json({ success: false, error: "Search query is required" });
    }

    // Get all published courses
    const { data: allCourses } = await supabase
      .from("services")
      .select(
        "id, title, description, category, price, thumbnail_url, average_rating, total_reviews, creator_id",
      )
      .eq("status", "published")
      .limit(100);

    if (!allCourses || allCourses.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const prompt = `You are a semantic search engine for an online course platform. Match the user's search query to the most relevant courses.

USER SEARCH QUERY: "${query}"

AVAILABLE COURSES (JSON):
${JSON.stringify(
  allCourses.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    description: (c.description || "").slice(0, 150),
  })),
)}

Find courses that semantically match the user's intent, even if the exact words don't match. For example, "I want to learn web design" should match "UI/UX Fundamentals".

Return ONLY a JSON array of matching course IDs, ranked by relevance (most relevant first). Maximum 10 IDs. If nothing matches well, return an empty array [].
Return ONLY the JSON array, no markdown, no explanation.`;

    const response = await askAI(prompt, {
      maxTokens: 256,
      temperature: 0.2,
    });

    let matchedIds;
    try {
      const cleaned = response.replace(/```json\n?|```\n?/g, "").trim();
      matchedIds = JSON.parse(cleaned);
    } catch {
      // Fallback: basic text matching
      const lowerQuery = query.toLowerCase();
      matchedIds = allCourses
        .filter(
          (c) =>
            c.title?.toLowerCase().includes(lowerQuery) ||
            c.description?.toLowerCase().includes(lowerQuery) ||
            c.category?.toLowerCase().includes(lowerQuery),
        )
        .map((c) => c.id);
    }

    // Build ordered result
    const courseMap = new Map(allCourses.map((c) => [c.id, c]));
    const results = matchedIds
      .filter((id) => courseMap.has(id))
      .map((id) => courseMap.get(id));

    return res.json({ success: true, data: results });
  } catch (error) {
    return handleAIError(res, error, "AI Smart Search");
  }
}

// ============================================
// 5. AI Content Summarizer
// ============================================
export async function summarizeContent(req, res) {
  try {
    const { content, type } = req.body;

    if (!content) {
      return res
        .status(400)
        .json({ success: false, error: "Content is required" });
    }

    const contextLabel =
      type === "course"
        ? "course"
        : type === "post"
          ? "community post"
          : "content";

    const prompt = `Summarize the following ${contextLabel} in 2-3 concise sentences. Make it informative and engaging. Do not use markdown formatting.

Content:
"${content.slice(0, 2000)}"

Summary:`;

    const summary = await askAI(prompt, {
      maxTokens: 200,
      temperature: 0.3,
    });

    return res.json({ success: true, data: { summary: summary.trim() } });
  } catch (error) {
    return handleAIError(res, error, "AI Summarize");
  }
}
