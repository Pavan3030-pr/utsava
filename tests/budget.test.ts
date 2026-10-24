import { describe, expect, it } from "vitest";
import { reconcileBudget } from "../src/lib/budget";
import { plan } from "./fixtures";

const sum = (b: { breakdown: { amount: number }[] }) => b.breakdown.reduce((s, x) => s + x.amount, 0);

describe("reconcileBudget", () => {
  it("scales line items to the requested total exactly", () => {
    const { budget, adjusted } = reconcileBudget(plan.budget, 2_500_000);
    expect(budget.total).toBe(2_500_000);
    expect(sum(budget)).toBe(2_500_000);
    expect(adjusted).toBe(true);
  });

  it("keeps a consistent model budget unchanged and reports not adjusted", () => {
    const { budget, adjusted } = reconcileBudget(plan.budget);
    expect(sum(budget)).toBe(2_000_000);
    expect(adjusted).toBe(false);
  });

  it("recomputes percentages that add to ~100", () => {
    const { budget } = reconcileBudget(plan.budget, 1_800_000);
    const pct = budget.breakdown.reduce((s, b) => s + b.percentage, 0);
    expect(pct).toBeGreaterThan(99.5);
    expect(pct).toBeLessThan(100.5);
  });

  it("drops invalid lines and survives an empty breakdown", () => {
    const messy = { total: 1, breakdown: [{ ...plan.budget.breakdown[0], amount: -5 }, { ...plan.budget.breakdown[1], amount: NaN }] };
    expect(reconcileBudget(messy, 100_000).adjusted).toBe(false);
    expect(reconcileBudget({ total: 0, breakdown: [] }).budget.breakdown).toHaveLength(0);
  });

  it("works for small budgets using ₹100 steps", () => {
    const { budget } = reconcileBudget(plan.budget, 50_000);
    expect(sum(budget)).toBe(50_000);
  });
});
