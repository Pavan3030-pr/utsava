import { isAiConfigured } from "@/lib/ai/model";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe for Cloud Run. Never exposes secrets. */
export function GET() {
  return Response.json({ ok: true, ai: isAiConfigured() });
}
