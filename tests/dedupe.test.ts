import { describe, expect, it } from "vitest";
import { dedupePlan, findDuplicateGuests, isDuplicateVendor, normKey, planGuestImport, sameGuest, sameThing } from "../src/lib/dedupe";
import { normalizePlan } from "../src/lib/plan-utils";
import type { EventPlan, Guest } from "../src/lib/schemas";
import { intake, plan } from "./fixtures";

describe("sameThing", () => {
  it("matches reworded repeats but not different tasks", () => {
    expect(sameThing("Book the caterer!", "book caterer")).toBe(false); // short phrases need an exact match…
    expect(sameThing("Book caterer", "book  CATERER.")).toBe(true);      // …which ignores case/punctuation
    expect(sameThing("Confirm the final guest count with caterer", "Confirm final guest count with the caterer")).toBe(true);
    expect(sameThing("Book DJ", "Book decorator")).toBe(false);
    expect(sameThing("Send invites to family", "Send invites to friends")).toBe(false);
  });
  it("keeps Indian-script text intact", () => {
    expect(normKey("విందు  భోజనం!")).toBe("విందు భోజనం");
  });
});

describe("dedupePlan", () => {
  const messy: EventPlan = {
    ...plan,
    budget: { total: 2_000_000, breakdown: [
      { category: "Venue", amount: 500_000, percentage: 25, notes: "", savingTip: "off-season" },
      { category: "venue", amount: 300_000, percentage: 15, notes: "hall", savingTip: "" },
      { category: "Catering", amount: 1_200_000, percentage: 60, notes: "", savingTip: "" },
    ] },
    timeline: [
      { daysBefore: 90, title: "Book venue", description: "" },
      { daysBefore: 90, title: "book venue", description: "deposit" },
      { daysBefore: 30, title: "Book venue", description: "second payment" },
    ],
    checklist: [
      { category: "Vendors", items: [{ task: "Book caterer", priority: "low", completed: false }, { task: "Book DJ", priority: "low", completed: false }] },
      { category: "vendors", items: [{ task: "book CATERER", priority: "high", completed: true }] },
      { category: "Food", items: [{ task: "Book caterer", priority: "medium", completed: false }, { task: "Finalise menu", priority: "high", completed: false }] },
    ],
    vendors: [
      { category: "Catering", whatToLookFor: "", estimatedRange: "₹1,000/plate", bookBy: "", questionsToAsk: ["Tasting?", "Tasting?"] },
      { category: "catering", whatToLookFor: "Hygiene", estimatedRange: "", bookBy: "3 months", questionsToAsk: ["Staff count?"] },
    ],
    culturalNotes: ["Offer coconut", "offer coconut!", "Remove shoes"],
    risks: [{ risk: "Rain", mitigation: "Tent" }, { risk: "rain", mitigation: "" }],
    schedule: [
      { day: "Day 1", name: "Haldi", vibe: "", items: [{ time: "9:00 AM", activity: "Haldi" }, { time: "9:00 AM", activity: "haldi" }] },
      { day: "Day 1", name: "haldi", vibe: "Fun", items: [{ time: "10:00 AM", activity: "Lunch" }] },
    ],
    themes: [{ name: "Marigold", description: "", palette: ["#F59E0B", "#f59e0b", "#B4234E"], decor: ["Garlands", "garlands"] }, { name: "marigold", description: "", palette: [], decor: [] }],
  };
  const { plan: out, removed } = dedupePlan(messy);

  it("merges repeated budget lines without changing the total", () => {
    expect(out.budget.breakdown.map((b) => [b.category, b.amount])).toEqual([["Venue", 800_000], ["Catering", 1_200_000]]);
    expect(out.budget.breakdown[0].notes).toBe("hall");
    expect(out.budget.breakdown.reduce((s, b) => s + b.amount, 0)).toBe(2_000_000);
  });
  it("only collapses milestones that fall on the same day", () => {
    expect(out.timeline.map((t) => [t.daysBefore, t.description])).toEqual([[90, "deposit"], [30, "second payment"]]);
  });
  it("merges categories, drops tasks repeated anywhere, and keeps progress + highest priority", () => {
    expect(out.checklist.map((c) => c.category)).toEqual(["Vendors", "Food"]);
    const caterer = out.checklist[0].items.find((i) => i.task === "Book caterer");
    expect(caterer).toMatchObject({ completed: true, priority: "high" });
    expect(out.checklist.flatMap((c) => c.items).filter((i) => /caterer/i.test(i.task))).toHaveLength(1);
  });
  it("merges vendors and unions their questions", () => {
    expect(out.vendors).toHaveLength(1);
    expect(out.vendors[0]).toMatchObject({ whatToLookFor: "Hygiene", estimatedRange: "₹1,000/plate", bookBy: "3 months" });
    expect(out.vendors[0].questionsToAsk).toEqual(["Tasting?", "Staff count?"]);
  });
  it("cleans notes, risks, schedule items and themes", () => {
    expect(out.culturalNotes).toEqual(["Offer coconut", "Remove shoes"]);
    expect(out.risks).toHaveLength(1);
    expect(out.risks[0].mitigation).toBe("Tent");
    expect(out.schedule).toHaveLength(1);
    expect(out.schedule[0].items.map((i) => i.activity)).toEqual(["Haldi", "Lunch"]);
    expect(out.themes).toHaveLength(1);
    expect(out.themes[0].palette).toEqual(["#F59E0B", "#B4234E"]);
    expect(out.themes[0].decor).toEqual(["Garlands"]);
  });
  it("counts what it removed and is idempotent", () => {
    expect(removed).toBeGreaterThan(10);
    expect(dedupePlan(out).removed).toBe(0);
  });
  it("runs inside normalizePlan and reports it", () => {
    const n = normalizePlan(messy, intake, new Date("2026-10-24T00:00:00Z"));
    expect(n.meta?.duplicatesRemoved).toBe(removed);
    expect(n.budget.total).toBe(intake.budget);
  });
  it("leaves a clean plan untouched", () => {
    expect(dedupePlan(plan).removed).toBe(0);
    expect(normalizePlan(plan, intake).meta?.duplicatesRemoved).toBeUndefined();
  });
});

const g = (id: string, name: string, phone: string | undefined, invited: string[], rsvps = 0): Guest => ({
  id, eventId: "e", name, phone, invited, token: id,
  rsvps: Array.from({ length: rsvps }, (_, i) => ({ event: invited[i] ?? "x", status: "yes" as const, partySize: 1 })),
});

describe("guest duplicates", () => {
  it("identifies the same person by phone, else by name", () => {
    expect(sameGuest({ name: "A", phone: "91987" }, { name: "B", phone: "91987" })).toBe(true);
    expect(sameGuest({ name: "Ravi Kumar", phone: "91111" }, { name: "Ravi Kumar", phone: "92222" })).toBe(false);
    expect(sameGuest({ name: "Ravi  kumar" }, { name: "Ravi Kumar", phone: "92222" })).toBe(true);
  });
  it("import: skips repeats, merges within the paste, and widens invites for existing guests", () => {
    const existing = [g("1", "Ravi Kumar", "919876543210", ["Wedding"])];
    const plan = planGuestImport(existing, [
      { name: "Ravi Kumar", phone: "919876543210" },
      { name: "Sita", phone: "919000000001" },
      { name: "sita", phone: "919000000001", group: "Friends" },
      { name: "Meena" },
    ], ["Wedding", "Sangeet"]);
    expect(plan.toInsert.map((x) => x.name)).toEqual(["Sita", "Meena"]);
    expect(plan.toInsert[0].group).toBe("Friends");
    expect(plan.toUpdate).toEqual([{ id: "1", invited: ["Wedding", "Sangeet"] }]);
    expect(plan.skipped).toBe(1);
  });
  it("import: a person already invited to every selected event is only skipped", () => {
    const r = planGuestImport([g("1", "Ravi", "91", ["Wedding"])], [{ name: "Ravi", phone: "91" }], ["Wedding"]);
    expect(r).toEqual({ toInsert: [], toUpdate: [], skipped: 1 });
  });
  it("finds existing repeats, keeps the one with RSVPs and unions invitations", () => {
    const list = [g("1", "Ravi", "91", ["Mehendi"]), g("2", "Ravi K", "91", ["Wedding"], 1), g("3", "Sita", "92", ["Wedding"])];
    const groups = findDuplicateGuests(list);
    expect(groups).toHaveLength(1);
    expect(groups[0].keep.id).toBe("2");
    expect(groups[0].remove.map((x) => x.id)).toEqual(["1"]);
    expect([...groups[0].invited].sort()).toEqual(["Mehendi", "Wedding"]);
    expect(findDuplicateGuests([list[2]])).toEqual([]);
  });
});

describe("vendor shortlist duplicates", () => {
  it("is case and punctuation insensitive per category", () => {
    const list = [{ id: "1", category: "Catering", name: "Spice Route", status: "shortlisted" as const }];
    expect(isDuplicateVendor(list, "spice route!", "catering")).toBe(true);
    expect(isDuplicateVendor(list, "Spice Route", "Photography")).toBe(false);
  });
});
