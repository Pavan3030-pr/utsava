import type { NextRequest } from "next/server";
import { streamObject } from "ai";
import type { ZodTypeAny } from "zod";
import { jsonError, parseRequest, withTimeout } from "@/lib/api";
import { AiNotConfiguredError, FAST_OPTIONS, getModel } from "@/lib/ai/model";
import { PLANNER_SYSTEM, buildPlanPrompt } from "@/lib/ai/prompts";
import { todayIso } from "@/lib/dates";
import { log } from "@/lib/log";
import { PART_SCHEMAS, PartQuerySchema, StreamRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Streams ONE slice of the plan (?part=core|schedule|ops). The browser fires all three
 * in parallel, so wall-clock time ≈ the slowest slice instead of the sum of all three.
 */
export async function POST(req: NextRequest) {
  const part = PartQuerySchema.safeParse(req.nextUrl.searchParams.get("part"));
  if (!part.success) return jsonError("Invalid part.", 422);

  // 4 slices per generation (+ silent retries) → ~8 generations / minute / IP
  const parsed = await parseRequest(req, StreamRequestSchema, { bucket: "stream", limit: 40, maxBytes: 8_000 });
  if (!parsed.ok) return parsed.response;

  try {
    const result = streamObject({
      // Retries (attempt ≥ 1) move down the model chain and run cooler for stricter JSON.
      model: getModel(parsed.data.attempt),
      schema: PART_SCHEMAS[part.data] as ZodTypeAny,
      system: PLANNER_SYSTEM,
      prompt: buildPlanPrompt(parsed.data, todayIso(), part.data),
      temperature: parsed.data.attempt > 0 ? 0.3 : 0.6,
      maxRetries: 1,
      abortSignal: withTimeout(req),
      providerOptions: FAST_OPTIONS,
      onError: ({ error }) => log("error", "plan_stream_failed", { part: part.data, attempt: parsed.data.attempt, error: error instanceof Error ? error.message : String(error) }),
    });
    return result.toTextStreamResponse({ headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return jsonError(err.message, 503);
    log("error", "plan_stream_setup_failed", { error: err instanceof Error ? err.message : String(err) });
    return jsonError("The AI planner is unavailable right now. Please try again.", 502);
  }
}
