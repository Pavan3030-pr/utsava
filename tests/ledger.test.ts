import { describe, expect, it } from "vitest";
import { summarizeLedger } from "../src/lib/ledger";
import type { Expense } from "../src/lib/schemas";

const breakdown = [{ category: "Venue", amount: 800_000 }, { category: "Catering", amount: 700_000 }];
const ex = (p: Partial<Expense>): Expense => ({ id: "x", category: "Venue", vendor: "V", amount: 0, paid: 0, ...p });

describe("summarizeLedger", () => {
  const expenses = [
    ex({ id: "1", category: "venue", vendor: "Hall", amount: 900_000, paid: 300_000, dueDate: "2026-11-01" }),
    ex({ id: "2", category: "Catering", vendor: "Caterer", amount: 500_000, paid: 500_000 }),
    ex({ id: "3", category: "Photography", vendor: "Studio", amount: 100_000, paid: 0, dueDate: "2027-06-01" }),
  ];
  const s = summarizeLedger(breakdown, expenses, "2026-10-24");

  it("totals planned, committed and paid", () => {
    expect(s.planned).toBe(1_500_000);
    expect(s.committed).toBe(1_500_000);
    expect(s.paid).toBe(800_000);
    expect(s.balanceDue).toBe(700_000);
    expect(s.headroom).toBe(0);
  });
  it("matches categories case-insensitively and flags overspend", () => {
    const venue = s.byCategory.find((c) => c.category === "Venue");
    expect(venue?.committed).toBe(900_000);
    expect(venue?.over).toBe(true);
    expect(s.byCategory.find((c) => c.category === "Catering")?.over).toBe(false);
  });
  it("surfaces unplanned categories instead of hiding them", () => {
    const photo = s.byCategory.find((c) => c.category === "Photography");
    expect(photo?.planned).toBe(0);
    expect(photo?.over).toBe(true);
  });
  it("lists only unpaid items due within the window, soonest first", () => {
    expect(s.dueSoon.map((d) => d.id)).toEqual(["1"]);
    expect(s.dueSoon[0].daysLeft).toBe(8);
  });
  it("reports overdue as negative days and never counts overpayment", () => {
    const o = summarizeLedger(breakdown, [ex({ amount: 100, paid: 500, dueDate: "2026-10-01" }), ex({ id: "y", amount: 1000, paid: 0, dueDate: "2026-10-20" })], "2026-10-24");
    expect(o.paid).toBe(100);
    expect(o.dueSoon.map((d) => d.daysLeft)).toEqual([-4]);
  });
  it("handles an empty ledger", () => {
    const e = summarizeLedger(breakdown, [], "2026-10-24");
    expect(e.committed).toBe(0);
    expect(e.headroom).toBe(1_500_000);
  });
});
