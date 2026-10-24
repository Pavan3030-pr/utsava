import type { NextRequest } from "next/server";
import { generateObject } from "ai";
import { jsonError, parseRequest, withTimeout } from "@/lib/api";
import { AiNotConfiguredError, FAST_OPTIONS, getModel } from "@/lib/ai/model";
import { PARSER_SYSTEM, buildParsePrompt, sanitizeField } from "@/lib/ai/prompts";
import { todayIso } from "@/lib/dates";
import { ParseRequestSchema, ParsedIntakeSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

/** "Plan a 200-guest Telugu wedding in Hyderabad, 25 lakhs" → structured form fields. */
export async function POST(req: NextRequest) {
  const parsed = await parseRequest(req, ParseRequestSchema, { bucket: "parse", limit: 15, maxBytes: 4_000 });
  if (!parsed.ok) return parsed.response;

  try {
    const today = todayIso();
    const { object } = await generateObject({
      model: getModel(),
      schema: ParsedIntakeSchema,
      system: PARSER_SYSTEM,
      prompt: buildParsePrompt(parsed.data.text, today),
      temperature: 0,
      maxRetries: 1,
      abortSignal: withTimeout(req, 25_000),
      providerOptions: FAST_OPTIONS,
    });

    // Clamp / clean model output before it reaches the form.
    const date =
      object.date && /^\d{4}-\d{2}-\d{2}$/.test(object.date) && object.date >= today ? object.date : undefined;
    return Response.json({
      intake: {
        ...object,
        title: object.title ? sanitizeField(object.title, 120) : undefined,
        date,
        guests: object.guests && object.guests > 0 ? Math.min(Math.round(object.guests), 10000) : undefined,
        budget: object.budget && object.budget >= 10000 ? Math.round(object.budget) : undefined,
        location: object.location ? sanitizeField(object.location, 80) : undefined,
        style: object.style ? sanitizeField(object.style, 200) : undefined,
        notes: object.notes ? sanitizeField(object.notes, 1000) : undefined,
      },
    });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return jsonError(err.message, 503);
    console.error("[plan/parse]", err);
    return jsonError("Couldn't understand that — try the form below.", 502);
  }
}
