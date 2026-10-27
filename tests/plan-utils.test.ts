import { describe, expect, it } from "vitest";
import { checklistProgress, mergeProgress, normalizePlan, planToText, safePalette, upcomingMilestones } from "../src/lib/plan-utils";
import { intake, plan } from "./fixtures";

describe("normalizePlan", () => {
  const n = normalizePlan(plan, intake, new Date("2026-10-24T00:00:00Z"));
  it("reconciles the budget to the user's number", () => {
    expect(n.budget.total).toBe(intake.budget);
    expect(n.meta?.budgetAdjusted).toBe(true);
  });
  it("sorts the timeline furthest-first", () => {
    expect(n.timeline.map((t) => t.daysBefore)).toEqual([90, 30, 0]);
  });
  it("resets checklist ticks and repairs palettes", () => {
    expect(n.checklist[0].items.every((i) => !i.completed)).toBe(true);
    expect(n.themes[0].palette).toEqual(["#F59E0B", "#B4234E"]);
  });
});

describe("normalizePlan keepProgress", () => {
  it("preserves ticks after an AI revision when asked", () => {
    const kept = normalizePlan(plan, intake, new Date(), true);
    expect(kept.checklist[0].items.map((i) => i.completed)).toEqual([true, false]);
  });
});

describe("safePalette", () => {
  it("falls back when fewer than two valid colours", () => {
    expect(safePalette(["red"])).toHaveLength(4);
    expect(safePalette(undefined)).toHaveLength(4);
  });
});

describe("mergeProgress", () => {
  it("keeps ticks for tasks that survive a revision (case-insensitive)", () => {
    const revised = { ...plan, checklist: [{ category: "Vendors", items: [
      { task: "book CATERER", priority: "high" as const, completed: false },
      { task: "Hire band", priority: "low" as const, completed: false },
    ] }] };
    const merged = mergeProgress(plan, revised);
    expect(merged.checklist[0].items.map((i) => i.completed)).toEqual([true, false]);
  });
});

describe("checklistProgress", () => {
  it("counts partial/streaming data defensively", () => {
    expect(checklistProgress(plan)).toEqual({ done: 1, total: 2, percent: 50 });
    expect(checklistProgress(undefined)).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe("planToText", () => {
  it("includes real dates, budget and checklist state", () => {
    const t = planToText(plan, intake);
    expect(t).toContain("₹20,00,000");
    expect(t).toContain("[x] Book caterer");
    expect(t).toContain("2027");
  });
});

describe("upcomingMilestones", () => {
  const tl = [{ daysBefore: 90, title: "Book venue" }, { daysBefore: 30, title: "Send invites" }, { daysBefore: 0, title: "Wedding" }, { daysBefore: undefined, title: "bad" }];
  it("returns future milestones soonest-first, skipping past and malformed ones", () => {
    // event 2027-02-14, today 2026-12-20 → venue (Nov 16) is past; invites Jan 15 (26d) then wedding (56d)
    const r = upcomingMilestones(tl, "2027-02-14", "2026-12-20", 5);
    expect(r.map((m) => m.title)).toEqual(["Send invites", "Wedding"]);
    expect(r[0].daysLeft).toBe(26);
  });
  it("is empty without an event date and respects the count", () => {
    expect(upcomingMilestones(tl, undefined, "2026-12-20")).toEqual([]);
    expect(upcomingMilestones(tl, "2027-02-14", "2026-01-01", 1)).toHaveLength(1);
  });
});
