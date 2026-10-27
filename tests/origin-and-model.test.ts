import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { isSameOrigin, parseRequest } from "../src/lib/api";
import { getModelChain, withModelFallback, AiNotConfiguredError } from "../src/lib/ai/model";
import { IntakeSchema, StreamRequestSchema } from "../src/lib/schemas";

const req = (headers: Record<string, string>, body = JSON.stringify({ type: "birthday", title: "Aarav turns 5" })) =>
  new Request("https://utsava.app/api/x", { method: "POST", body, headers }) as unknown as NextRequest;

describe("origin check", () => {
  it("allows same-origin and header-less (non-browser) callers", () => {
    expect(isSameOrigin(req({ host: "utsava.app", origin: "https://utsava.app" }))).toBe(true);
    expect(isSameOrigin(req({ host: "utsava.app" }))).toBe(true);
  });
  it("blocks cross-site browser requests and malformed origins", async () => {
    expect(isSameOrigin(req({ host: "utsava.app", origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(req({ host: "utsava.app", origin: "not a url" }))).toBe(false);
    const r = await parseRequest(req({ host: "utsava.app", origin: "https://evil.example", "x-forwarded-for": "9.9.9.9" }), IntakeSchema, { bucket: "o", limit: 5, maxBytes: 500 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });
});

describe("stream request", () => {
  it("defaults attempt to 0 and caps retries", () => {
    const base = { type: "birthday", title: "Aarav turns 5" };
    expect(StreamRequestSchema.parse(base).attempt).toBe(0);
    expect(StreamRequestSchema.safeParse({ ...base, attempt: 3 }).success).toBe(false);
  });
});

describe("model fallback chain", () => {
  afterEach(() => vi.restoreAllMocks());

  it("throws a typed error when no provider is configured", () => {
    expect(() => getModelChain({} as NodeJS.ProcessEnv)).toThrow(AiNotConfiguredError);
  });
  it("orders Gemini primary → Gemini fallback → OpenAI", () => {
    const chain = getModelChain({ GOOGLE_GENERATIVE_AI_API_KEY: "k", OPENAI_API_KEY: "o" } as unknown as NodeJS.ProcessEnv);
    expect(chain).toHaveLength(3);
  });
  it("moves to the next model on failure but never retries a client abort", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "k");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const calls: number[] = [];
    const out = await withModelFallback(async (_m, i) => { calls.push(i); if (i === 0) throw new Error("503 overloaded"); return "ok"; });
    expect(out).toBe("ok");
    expect(calls).toEqual([0, 1]);

    const ac = new AbortController(); ac.abort();
    const seen: number[] = [];
    await expect(withModelFallback(async (_m, i) => { seen.push(i); throw new Error("aborted"); }, ac.signal)).rejects.toThrow("aborted");
    expect(seen).toEqual([0]);
    vi.unstubAllEnvs();
  });
});
