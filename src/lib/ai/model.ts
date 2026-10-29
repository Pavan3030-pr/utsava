import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI is not configured on this server. Set GOOGLE_GENERATIVE_AI_API_KEY.");
    this.name = "AiNotConfiguredError";
  }
}

/**
 * Ordered list of models to try. Index 0 is the primary; later entries are used when the
 * primary is overloaded, rate-limited or returns malformed output.
 *   Gemini primary → Gemini fallback (lighter, different capacity pool) → OpenAI (if keyed).
 */
export function getModelChain(env: NodeJS.ProcessEnv = process.env): LanguageModel[] {
  const chain: LanguageModel[] = [];
  const googleKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (googleKey) {
    // GOOGLE_GENERATIVE_AI_BASE_URL lets you route through a proxy/gateway (and lets the e2e suite use a fake model).
    const google = createGoogleGenerativeAI({ apiKey: googleKey, ...(env.GOOGLE_GENERATIVE_AI_BASE_URL ? { baseURL: env.GOOGLE_GENERATIVE_AI_BASE_URL } : {}) });
    const primary = env.GEMINI_MODEL || "gemini-2.5-flash";
    const fallback = env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite";
    chain.push(google(primary));
    if (fallback !== primary) chain.push(google(fallback));
  }
  if (env.OPENAI_API_KEY) {
    chain.push(createOpenAI({ apiKey: env.OPENAI_API_KEY })(env.OPENAI_MODEL || "gpt-4o-mini"));
  }
  if (chain.length === 0) throw new AiNotConfiguredError();
  return chain;
}

/** Primary model, or the n-th fallback when a slice is being retried. */
export function getModel(attempt = 0): LanguageModel {
  const chain = getModelChain();
  return chain[Math.min(Math.max(attempt, 0), chain.length - 1)];
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY);
}

/** Runs `run` against each model in the chain until one succeeds. Client aborts are never retried. */
export async function withModelFallback<T>(
  run: (model: LanguageModel, attempt: number) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const chain = getModelChain();
  let lastError: unknown;
  for (let i = 0; i < chain.length; i++) {
    try {
      return await run(chain[i], i);
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
      console.warn(JSON.stringify({ level: "warn", msg: "model_fallback", attempt: i, error: err instanceof Error ? err.message : String(err) }));
    }
  }
  throw lastError;
}

/**
 * Latency tuning: Gemini 2.5 "thinking" adds many seconds before the first token.
 * Structured planning from a clear brief doesn't need it, so we switch it off.
 */
export const FAST_OPTIONS = {
  google: { thinkingConfig: { thinkingBudget: 0 } },
} as const;
