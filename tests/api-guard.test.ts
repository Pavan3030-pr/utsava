import { beforeEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { parseRequest } from "../src/lib/api";
import { resetRateLimits } from "../src/lib/rate-limit";
import { IntakeSchema } from "../src/lib/schemas";

const post = (body: string, ip = "1.1.1.1") =>
  new Request("http://localhost/api/x", { method: "POST", body, headers: { "x-forwarded-for": ip } }) as unknown as NextRequest;
const opts = { bucket: "t", limit: 3, maxBytes: 200 };
const valid = JSON.stringify({ type: "birthday", title: "Aarav turns 5" });

describe("API guard (shared by every route)", () => {
  beforeEach(resetRateLimits);

  it("accepts a valid body and applies schema defaults", async () => {
    const r = await parseRequest(post(valid), IntakeSchema, opts);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.language).toBe("en");
  });

  it("rejects malformed JSON with 400", async () => {
    const r = await parseRequest(post("{not json"), IntakeSchema, opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("rejects schema violations with 422 and a readable message", async () => {
    const r = await parseRequest(post(JSON.stringify({ type: "party", title: "x" })), IntakeSchema, opts);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(422);
      expect(((await r.response.json()) as { error: string }).error).toContain("Invalid");
    }
  });

  it("rejects oversized bodies with 413 before parsing", async () => {
    const r = await parseRequest(post(JSON.stringify({ type: "birthday", title: "x".repeat(500) })), IntakeSchema, opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
  });

  it("rate-limits per IP with Retry-After, without affecting other IPs", async () => {
    for (let i = 0; i < 3; i++) expect((await parseRequest(post(valid), IntakeSchema, opts)).ok).toBe(true);
    const blocked = await parseRequest(post(valid), IntakeSchema, opts);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(429);
      expect(Number(blocked.response.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    }
    expect((await parseRequest(post(valid, "2.2.2.2"), IntakeSchema, opts)).ok).toBe(true);
  });
});
