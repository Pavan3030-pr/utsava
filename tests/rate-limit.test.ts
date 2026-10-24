import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "../src/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(resetRateLimits);
  const opts = { limit: 3, windowMs: 1000 };

  it("allows up to the limit then blocks with Retry-After", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("a", opts, 100 + i).ok).toBe(true);
    const blocked = rateLimit("a", opts, 500);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
  });
  it("recovers after the window and isolates keys", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", opts, 0);
    expect(rateLimit("b", opts, 10).ok).toBe(true);
    expect(rateLimit("a", opts, 1500).ok).toBe(true);
  });
});
