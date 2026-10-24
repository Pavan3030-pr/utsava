/**
 * Tiny sliding-window limiter. In-memory = per instance, which is fine for a
 * stateless Cloud Run / Vercel deployment as a cost & abuse guard.
 * (Swap for Redis/Upstash if you need a global limit.)
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
