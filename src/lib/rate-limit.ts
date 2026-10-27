/**
 * Rate limiting for a public, unauthenticated AI app.
 *
 * - `rateLimit` is a tiny in-memory sliding window (per server instance; always available).
 * - `checkRateLimit` uses Upstash Redis (REST) when UPSTASH_REDIS_REST_URL/TOKEN are set, giving a
 *   limit that is global across every serverless instance, and silently degrades to the
 *   in-memory limiter if Redis is unreachable (the app never goes down because the limiter did).
 */
const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
  now: number = Date.now(),
): RateResult {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < opts.windowMs);
  if (hits.length >= opts.limit) {
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((opts.windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
  return { ok: true, remaining: opts.limit - hits.length, retryAfterSec: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}

export function rateLimitBackend(): "redis" | "memory" {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? "redis" : "memory";
}

/** Fixed-window counter in Redis: INCR + EXPIRE in one round trip. */
async function redisLimit(key: string, opts: { limit: number; windowMs: number }, now: number): Promise<RateResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL as string;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN as string;
  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const slot = Math.floor(now / opts.windowMs);
  const redisKey = `utsava:rl:${key}:${slot}`;
  const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", redisKey], ["EXPIRE", redisKey, windowSec]]),
    signal: AbortSignal.timeout(1500),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const out = (await res.json()) as { result?: number }[];
  const count = Number(out?.[0]?.result);
  if (!Number.isFinite(count)) throw new Error("upstash bad response");
  if (count > opts.limit) {
    const windowEnd = (slot + 1) * opts.windowMs;
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((windowEnd - now) / 1000)) };
  }
  return { ok: true, remaining: opts.limit - count, retryAfterSec: 0 };
}

export async function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
  now: number = Date.now(),
): Promise<RateResult> {
  if (rateLimitBackend() === "redis") {
    try {
      return await redisLimit(key, opts, now);
    } catch (err) {
      console.warn(JSON.stringify({ level: "warn", msg: "ratelimit_redis_unavailable", error: err instanceof Error ? err.message : String(err) }));
    }
  }
  return rateLimit(key, opts, now);
}
