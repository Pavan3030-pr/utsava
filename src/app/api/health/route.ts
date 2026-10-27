import { isAiConfigured } from "@/lib/ai/model";
import { rateLimitBackend } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe. Reports only booleans and a build id — never secrets. */
export function GET() {
  return Response.json(
    {
      ok: true,
      ai: isAiConfigured(),
      db: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      rsvp: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      rateLimit: rateLimitBackend(),
      build: (process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 7),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
