import type { EventPlan } from "./schemas";

type Budget = EventPlan["budget"];

export interface ReconcileResult {
  budget: Budget;
  /** true when the model's numbers had to be rebalanced */
  adjusted: boolean;
}

/**
 * LLMs are bad at arithmetic. This guarantees the budget the user sees
 * actually adds up: line items are scaled to the requested total (or to
 * their own sum), rounded to sensible INR steps, and percentages recomputed.
 */
export function reconcileBudget(budget: Budget, requestedTotal?: number): ReconcileResult {
  const items = (budget.breakdown ?? []).filter((b) => Number.isFinite(b.amount) && b.amount > 0);
  if (items.length === 0) return { budget, adjusted: false };

  const sum = items.reduce((s, b) => s + b.amount, 0);
  const target = requestedTotal && requestedTotal > 0 ? Math.round(requestedTotal) : Math.round(sum);
  const step = target >= 100_000 ? 1000 : 100;
  const factor = target / sum;

  const scaled = items.map((b) => ({
    ...b,
    amount: Math.max(step, Math.round((b.amount * factor) / step) * step),
  }));

  // Push any rounding drift onto the largest line so the total is exact.
  const drift = target - scaled.reduce((s, b) => s + b.amount, 0);
  let largest = 0;
  scaled.forEach((b, i) => {
    if (b.amount > scaled[largest].amount) largest = i;
  });
  scaled[largest].amount += drift;

  const breakdown = scaled.map((b) => ({
    ...b,
    percentage: Math.round((b.amount / target) * 1000) / 10,
  }));

  const adjusted =
    Math.abs(sum - target) / target > 0.005 || items.length !== (budget.breakdown ?? []).length;

  return { budget: { total: target, breakdown }, adjusted };
}
