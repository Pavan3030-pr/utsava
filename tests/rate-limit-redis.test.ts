import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, rateLimitBackend, resetRateLimits } from "../src/lib/rate-limit";

const opts = { limit: 2, windowMs: 60_000 };

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the in-memory limiter when Redis is not configured", async () => {
    expect(rateLimitBackend()).toBe("memory");
    expect((await checkRateLimit("k", opts)).ok).toBe(true);
    expect((await checkRateLimit("k", opts)).ok).toBe(true);
    expect((await checkRateLimit("k", opts)).ok).toBe(false);
  });

  it("enforces the limit through Upstash when configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    let count = 0;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ result: ++count }, { result: 1 }]))));
    expect(rateLimitBackend()).toBe("redis");
    expect((await checkRateLimit("k", opts)).ok).toBe(true);
    expect((await checkRateLimit("k", opts)).ok).toBe(true);
    const blocked = await checkRateLimit("k", opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("falls back to memory (never fails open or crashes) when Redis is down", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect((await checkRateLimit("k", opts)).ok).toBe(true);
    expect((await checkRateLimit("k", opts)).ok).toBe(true);
    expect((await checkRateLimit("k", opts)).ok).toBe(false);
  });
});
