import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI is not configured on this server. Set GOOGLE_GENERATIVE_AI_API_KEY.");
    this.name = "AiNotConfiguredError";
  }
}

/** Gemini first (primary), OpenAI only as an optional fallback. */
export function getModel(): LanguageModel {
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    return google(process.env.GEMINI_MODEL || "gemini-2.5-flash");
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return createOpenAI({ apiKey: openaiKey })("gpt-4o-mini");
  }
  throw new AiNotConfiguredError();
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY);
}
