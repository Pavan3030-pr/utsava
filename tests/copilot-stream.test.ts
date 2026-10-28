import { describe, expect, it } from "vitest";
import { streamObject } from "ai";
import { MockLanguageModelV1, simulateReadableStream } from "ai/test";
import { buildRefineSchema } from "../src/lib/ai/copilot";
import { RefineResultSchema } from "../src/lib/schemas";

/** Drives the real streamObject + scoped schema with a fake model, exactly like the route does. */
function fakeModel(json: string) {
  const chunks = json.match(/.{1,40}/g) ?? [];
  return new MockLanguageModelV1({
    defaultObjectGenerationMode: "json",
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          ...chunks.map((textDelta) => ({ type: "text-delta" as const, textDelta })),
          { type: "finish" as const, finishReason: "stop" as const, logprobs: undefined, usage: { promptTokens: 10, completionTokens: 20 } },
        ],
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  });
}

describe("copilot streaming", () => {
  const core = { title: "T", tagline: "t", summary: "s", budget: { total: 100, breakdown: [{ category: "Venue", amount: 100, percentage: 100, notes: "", savingTip: "" }] } };
  const body = JSON.stringify({ reply: "Done — trimmed 15%.", changes: ["Venue −15%"], updates: { core } });

  it("emits the reply before the plan parts and ends with a valid result", async () => {
    const result = streamObject({ model: fakeModel(body), schema: buildRefineSchema(["core"]), prompt: "go" });
    const partials: { reply?: string; updates?: unknown }[] = [];
    for await (const p of result.partialObjectStream) partials.push(p as never);
    const firstWithReply = partials.findIndex((p) => p.reply);
    const firstWithUpdates = partials.findIndex((p) => p.updates && Object.keys(p.updates as object).length > 0);
    expect(firstWithReply).toBeGreaterThanOrEqual(0);
    expect(firstWithReply).toBeLessThan(firstWithUpdates);
    const final = await result.object;
    expect(RefineResultSchema.safeParse(final).success).toBe(true);
    expect(final.reply).toContain("trimmed");
  });

  it("rejects a part the scope doesn't allow", async () => {
    const bad = JSON.stringify({ reply: "x", changes: [], updates: { core, bogus: { a: 1 } } });
    const result = streamObject({ model: fakeModel(bad), schema: buildRefineSchema(["core"]), prompt: "go", onError: () => {} });
    for await (const _ of result.partialObjectStream) void _;
    const final = await result.object;
    expect(Object.keys(final.updates)).toEqual(["core"]); // unknown keys are stripped, never applied
  });

  it("surfaces malformed output as an error so the client can retry", async () => {
    const result = streamObject({ model: fakeModel('{"reply": 5, "changes": "nope"'), schema: buildRefineSchema(["core"]), prompt: "go", onError: () => {} });
    const drain = (async () => { for await (const _ of result.partialObjectStream) void _; })();
    await expect(result.object).rejects.toBeTruthy();
    await drain.catch(() => {});
  });
});
