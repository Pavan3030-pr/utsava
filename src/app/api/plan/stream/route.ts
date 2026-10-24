import type { NextRequest } from "next/server";
import { streamObject } from "ai";
import { jsonError, parseRequest, withTimeout } from "@/lib/api";
import { AiNotConfiguredError, getModel } from "@/lib/ai/model";
import { PLANNER_SYSTEM, buildPlanPrompt } from "@/lib/ai/prompts";
import { todayIso } from "@/lib/dates";
import { IntakeSchema, PlanSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Streams a structured plan token-by-token so the UI can render it live. */
export async function POST(req: NextRequest) {
  const parsed = await parseRequest(req, IntakeSchema, { bucket: "stream", limit: 6, maxBytes: 8_000 });
  if (!parsed.ok) return parsed.response;

  try {
    const result = streamObject({
      model: getModel(),
      schema: PlanSchema,
      system: PLANNER_SYSTEM,
      prompt: buildPlanPrompt(parsed.data, todayIso()),
      temperature: 0.6,
      maxRetries: 1,
      abortSignal: withTimeout(req),
      onError: ({ error }) => console.error("[plan/stream]", error),
    });
    return result.toTextStreamResponse({ headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return jsonError(err.message, 503);
    console.error("[plan/stream]", err);
    return jsonError("The AI planner is unavailable right now. Please try again.", 502);
  }
}
