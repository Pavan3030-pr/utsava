import { daysBetween } from "./dates";
import type { Expense } from "./schemas";

export interface CategoryRow {
  category: string;
  planned: number;
  committed: number;
  paid: number;
  over: boolean;
}

export interface LedgerSummary {
  planned: number;
  committed: number;
  paid: number;
  /** committed but not yet paid */
  balanceDue: number;
  /** planned budget still uncommitted (negative = over budget) */
  headroom: number;
  byCategory: CategoryRow[];
  /** unpaid expenses overdue or due within `windowDays`, soonest first */
  dueSoon: (Expense & { daysLeft: number })[];
}

export function summarizeLedger(
  breakdown: { category: string; amount: number }[],
  expenses: Expense[],
  today: string,
  windowDays = 14,
): LedgerSummary {
  const rows = new Map<string, CategoryRow>();
  const key = (c: string) => c.trim().toLowerCase();
  for (const b of breakdown) {
    rows.set(key(b.category), { category: b.category, planned: b.amount, committed: 0, paid: 0, over: false });
  }
  for (const e of expenses) {
    const k = key(e.category) || "other";
    const row = rows.get(k) ?? { category: e.category || "Other", planned: 0, committed: 0, paid: 0, over: false };
    row.committed += e.amount;
    row.paid += Math.min(e.paid, e.amount);
    rows.set(k, row);
  }
  const byCategory = [...rows.values()].map((r) => ({ ...r, over: r.committed > r.planned }));

  const planned = breakdown.reduce((s, b) => s + b.amount, 0);
  const committed = expenses.reduce((s, e) => s + e.amount, 0);
  const paid = expenses.reduce((s, e) => s + Math.min(e.paid, e.amount), 0);

  const dueSoon = expenses
    .filter((e) => e.dueDate && e.paid < e.amount)
    .map((e) => ({ ...e, daysLeft: daysBetween(today, e.dueDate as string) }))
    .filter((e) => e.daysLeft <= windowDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return { planned, committed, paid, balanceDue: committed - paid, headroom: planned - committed, byCategory, dueSoon };
}
