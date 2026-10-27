import type { NextRequest } from "next/server";
import { generateObject } from "ai";
import { jsonError, parseRequest, withTimeout } from "@/lib/api";
import { AiNotConfiguredError, FAST_OPTIONS, withModelFallback } from "@/lib/ai/model";
import { REFINE_SYSTEM, buildRefinePrompt } from "@/lib/ai/prompts";
import { reconcileBudget } from "@/lib/budget";
import { todayIso } from "@/lib/dates";
import { log } from "@/lib/log";
import { RefineRequestSchema, RefineResultSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/** AI Copilot: applies a natural-language instruction to an existing plan. */
export async function POST(req: NextRequest) {
  const parsed = await parseRequest(req, RefineRequestSchema, { bucket: "refine", limit: 10, maxBytes: 250_000 });
  if (!parsed.ok) return parsed.response;
  const { intake, plan, instruction } = parsed.data;

  try {
    const { object } = await withModelFallback(
      (model, attempt) =>
        generateObject({
          model,
          schema: RefineResultSchema,
          system: REFINE_SYSTEM,
          prompt: buildRefinePrompt(intake, plan, instruction, todayIso()),
          temperature: attempt > 0 ? 0.2 : 0.4,
          maxRetries: 0,
          abortSignal: withTimeout(req, 27_000),
          providerOptions: FAST_OPTIONS,
        }),
      req.signal,
    );
    // Never trust LLM arithmetic: reconcile any revised budget before returning.
    const updates = { ...object.updates };
    if (updates.core) {
      updates.core = { ...updates.core, budget: reconcileBudget(updates.core.budget, undefined).budget };
    }
    return Response.json({ ...object, updates }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return jsonError(err.message, 503);
    log("error", "plan_refine_failed", { error: err instanceof Error ? err.message : String(err) });
    return jsonError("Couldn't revise the plan. Try rephrasing your request.", 502);
  }
}
