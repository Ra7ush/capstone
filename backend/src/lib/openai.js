import OpenAI from "openai";
import { ENV } from "../config/env.js";
import { logger } from "../config/logger.js";

let openai = null;

function getClient() {
  if (!openai) {
    if (!ENV.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });
  }
  return openai;
}

const MODEL = "gpt-4o-mini"; // Fast, cheap, great for all our use cases

/**
 * Send a prompt to OpenAI and get a text response.
 * @param {string} prompt - The full prompt to send
 * @param {object} [options] - Optional config
 * @param {number} [options.maxTokens=1024] - Max output tokens
 * @param {number} [options.temperature=0.7] - Creativity (0-1)
 * @returns {Promise<string>} The model's text response
 */
export async function askAI(prompt, options = {}) {
  const { maxTokens = 1024, temperature = 0.7 } = options;

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    logger.error("OpenAI API error:", error.message);
    throw error;
  }
}

/**
 * Send a multi-turn chat to OpenAI.
 * @param {Array<{role: string, content: string}>} history - Chat history
 * @param {string} userMessage - The latest user message
 * @param {string} systemInstruction - System-level context
 * @returns {Promise<string>} The model's reply
 */
export async function chatWithAI(history, userMessage, systemInstruction) {
  try {
    const client = getClient();

    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map((msg) => ({
        role: msg.role === "model" ? "assistant" : msg.role,
        content: msg.content || msg.parts || "",
      })),
      { role: "user", content: userMessage },
    ];

    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 512,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    logger.error("OpenAI Chat API error:", error.message);
    throw error;
  }
}
