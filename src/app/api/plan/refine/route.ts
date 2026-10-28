import type { NextRequest } from "next/server";
import { streamObject } from "ai";
import { jsonError, parseRequest, withTimeout } from "@/lib/api";
import { AiNotConfiguredError, FAST_OPTIONS, getModel } from "@/lib/ai/model";
import { COPILOT_SYSTEM, buildCopilotPrompt, buildRefineSchema, detectScope } from "@/lib/ai/copilot";
import { todayIso } from "@/lib/dates";
import { log } from "@/lib/log";
import { RefineRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * AI Copilot (streaming). The reply and change list reach the browser within about a second, the
 * rewritten plan parts follow. Only the parts the instruction can affect are sent to — and rewritten by —
 * the model, and retries (attempt ≥ 1) move down the fallback model chain.
 */
export async function POST(req: NextRequest) {
  const parsed = await parseRequest(req, RefineRequestSchema, { bucket: "refine", limit: 14, maxBytes: 250_000 });
  if (!parsed.ok) return parsed.response;
  const { intake, plan, instruction, attempt, history } = parsed.data;
  const scope = detectScope(instruction);
  const started = Date.now();

  try {
    const result = streamObject({
      model: getModel(attempt),
      schema: buildRefineSchema(scope),
      system: COPILOT_SYSTEM,
      prompt: buildCopilotPrompt(intake, plan, instruction, todayIso(), scope, history),
      temperature: attempt > 0 ? 0.2 : 0.4,
      maxRetries: 1,
      abortSignal: withTimeout(req, 55_000),
      providerOptions: FAST_OPTIONS,
      onFinish: () => log("info", "copilot_done", { ms: Date.now() - started, scope: scope.join(","), attempt }),
      onError: ({ error }) => log("error", "copilot_stream_failed", { scope: scope.join(","), attempt, error: error instanceof Error ? error.message : String(error) }),
    });
    return result.toTextStreamResponse({ headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return jsonError(err.message, 503);
    log("error", "copilot_setup_failed", { error: err instanceof Error ? err.message : String(err) });
    return jsonError("Couldn't revise the plan. Try rephrasing your request.", 502);
  }
}
