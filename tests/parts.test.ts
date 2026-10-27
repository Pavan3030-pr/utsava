import { describe, expect, it } from "vitest";
import { PART_SCHEMAS, PLAN_PARTS, PlanSchema, RefineResultSchema, RsvpSubmitSchema } from "../src/lib/schemas";
import { plan } from "./fixtures";

describe("parallel generation slices", () => {
  const all = Object.keys(PlanSchema.shape).sort();
  const sliced = PLAN_PARTS.flatMap((p) => Object.keys(PART_SCHEMAS[p].shape));

  it("are disjoint and together cover every field of the plan (guards against schema drift)", () => {
    expect(new Set(sliced).size).toBe(sliced.length);
    expect([...sliced].sort()).toEqual(all);
  });

  it("split a plan into slices that re-merge into a valid plan", () => {
    const merged = PLAN_PARTS.reduce((acc, p) => ({ ...acc, ...PART_SCHEMAS[p].parse(plan) }), {});
    expect(PlanSchema.safeParse(merged).success).toBe(true);
  });

  it("copilot may return zero, some, or all slices", () => {
    expect(RefineResultSchema.safeParse({ reply: "ok", changes: [], updates: {} }).success).toBe(true);
    expect(RefineResultSchema.safeParse({ reply: "ok", changes: ["x"], updates: { core: PART_SCHEMAS.core.parse(plan) } }).success).toBe(true);
    expect(RefineResultSchema.safeParse({ reply: "ok", changes: [] }).success).toBe(false);
  });
});

describe("RsvpSubmitSchema", () => {
  const ok = { responses: [{ event: "Sangeet", status: "yes", partySize: 3 }] };
  it("accepts a normal response", () => expect(RsvpSubmitSchema.safeParse(ok).success).toBe(true));
  it.each([
    [{ responses: [] }],
    [{ responses: [{ event: "x", status: "yes", partySize: 0 }] }],
    [{ responses: [{ event: "x", status: "yes", partySize: 99 }] }],
    [{ responses: [{ event: "x", status: "attending", partySize: 1 }] }],
    [{ responses: [{ event: "x", status: "no", partySize: 1, note: "n".repeat(400) }] }],
  ])("rejects bad input %#", (bad) => expect(RsvpSubmitSchema.safeParse(bad).success).toBe(false));
});
