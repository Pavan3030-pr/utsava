import type { NextRequest } from "next/server";
import { streamObject } from "ai";
import type { ZodTypeAny } from "zod";
import { jsonError, parseRequest, withTimeout } from "@/lib/api";
import { AiNotConfiguredError, FAST_OPTIONS, getModel } from "@/lib/ai/model";
import { PLANNER_SYSTEM, buildPlanPrompt } from "@/lib/ai/prompts";
import { todayIso } from "@/lib/dates";
import { IntakeSchema, PART_SCHEMAS, PartQuerySchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Streams ONE slice of the plan (?part=core|schedule|ops). The browser fires all three
 * in parallel, so wall-clock time ≈ the slowest slice instead of the sum of all three.
 */
export async function POST(req: NextRequest) {
  const part = PartQuerySchema.safeParse(req.nextUrl.searchParams.get("part"));
  if (!part.success) return jsonError("Invalid part.", 422);

  // 4 slices per generation → ~6 generations / minute / IP
  const parsed = await parseRequest(req, IntakeSchema, { bucket: "stream", limit: 24, maxBytes: 8_000 });
  if (!parsed.ok) return parsed.response;

  try {
    const result = streamObject({
      model: getModel(),
      schema: PART_SCHEMAS[part.data] as ZodTypeAny,
      system: PLANNER_SYSTEM,
      prompt: buildPlanPrompt(parsed.data, todayIso(), part.data),
      temperature: 0.6,
      maxRetries: 1,
      abortSignal: withTimeout(req),
      providerOptions: FAST_OPTIONS,
      onError: ({ error }) => console.error(`[plan/stream:${part.data}]`, error),
    });
    return result.toTextStreamResponse({ headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return jsonError(err.message, 503);
    console.error("[plan/stream]", err);
    return jsonError("The AI planner is unavailable right now. Please try again.", 502);
  }
}
