import type { NextRequest } from "next/server";
import type { z } from "zod";
import { checkRateLimit } from "./rate-limit";

export function clientIp(req: NextRequest): string {
  // On Vercel the platform sets these headers itself, so they can't be spoofed by the caller.
  const fwd = req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function jsonError(message: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/** Browsers always send Origin on cross-site POSTs. Reject any that don't come from our own host. */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, bench script, server-to-server)
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

/** Origin → rate-limit → size-limit → JSON-parse → schema-validate. One place for all API hardening. */
export async function parseRequest<T>(
  req: NextRequest,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  opts: { bucket: string; limit: number; maxBytes: number },
): Promise<Parsed<T>> {
  if (!isSameOrigin(req)) return { ok: false, response: jsonError("Cross-origin requests are not allowed.", 403) };

  const rl = await checkRateLimit(`${opts.bucket}:${clientIp(req)}`, { limit: opts.limit, windowMs: 60_000 });
  if (!rl.ok) {
    return {
      ok: false,
      response: jsonError("Too many requests — please wait a moment and try again.", 429, {
        "Retry-After": String(rl.retryAfterSec),
      }),
    };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: jsonError("Could not read request.", 400) };
  }
  if (text.length > opts.maxBytes) return { ok: false, response: jsonError("Request too large.", 413) };

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError("Request body must be valid JSON.", 400) };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.join(".") || "input";
    return { ok: false, response: jsonError(`Invalid ${where}: ${first?.message ?? "bad value"}`, 422) };
  }
  return { ok: true, data: result.data };
}

export function withTimeout(req: NextRequest, ms = 55_000): AbortSignal {
  return AbortSignal.any([req.signal, AbortSignal.timeout(ms)]);
}
