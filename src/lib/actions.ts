import { addDays, daysBetween } from "./dates";
import { summarizeLedger } from "./ledger";
import type { EventPlan, Intake, Ledger } from "./schemas";
import { formatINR } from "./format";

export type TabTarget = "overview" | "budget" | "spend" | "schedule" | "checklist" | "vendors" | "guests" | "ideas" | "copilot" | "runsheet";

export interface NextAction {
  id: string;
  tone: "urgent" | "soon" | "tip";
  title: string;
  detail: string;
  tab: TabTarget;
  cta: string;
}

const RANK = { urgent: 0, soon: 1, tip: 2 } as const;

/** "What should I do next?" — derived only from the user's own plan, spend and vendor data. */
export function nextActions(input: { plan: EventPlan; intake: Intake; ledger: Ledger; today: string }, max = 4): NextAction[] {
  const { plan, intake, ledger, today } = input;
  const out: NextAction[] = [];
  const toGo = intake.date ? daysBetween(today, intake.date) : undefined;
  if (toGo !== undefined && toGo < 0) return [];

  const sum = summarizeLedger(plan.budget.breakdown, ledger.expenses, today, 7);

  const overdue = sum.dueSoon.filter((e) => e.daysLeft < 0);
  if (overdue.length) {
    const owed = overdue.reduce((n, e) => n + (e.amount - e.paid), 0);
    out.push({ id: "pay-overdue", tone: "urgent", title: `${formatINR(owed)} overdue to ${overdue[0].vendor || "a vendor"}${overdue.length > 1 ? ` (+${overdue.length - 1} more)` : ""}`, detail: "Late payments can put bookings at risk. Mark it paid or update the due date.", tab: "spend", cta: "Open spend tracker" });
  }
  const dueWeek = sum.dueSoon.filter((e) => e.daysLeft >= 0);
  if (dueWeek.length) {
    const next = dueWeek[0];
    out.push({ id: "pay-soon", tone: "soon", title: `Payment due ${next.daysLeft === 0 ? "today" : `in ${next.daysLeft} day${next.daysLeft === 1 ? "" : "s"}`}: ${next.vendor || next.category}`, detail: `${formatINR(next.amount - next.paid)} remaining${dueWeek.length > 1 ? ` · ${dueWeek.length - 1} more this week` : ""}.`, tab: "spend", cta: "Review payments" });
  }
  const over = sum.byCategory.filter((r) => r.over);
  if (over.length) {
    const r = over[0];
    out.push({ id: "over-budget", tone: "urgent", title: `${r.category} is ${formatINR(r.committed - r.planned)} over its plan`, detail: "Ask the Copilot to rebalance the budget, or trim another category.", tab: "copilot", cta: "Rebalance with Copilot" });
  }

  if (intake.date) {
    const week = plan.timeline
      .map((t) => ({ ...t, due: addDays(intake.date as string, -t.daysBefore) }))
      .filter((t) => { const d = daysBetween(today, t.due); return d >= 0 && d <= 7 && t.daysBefore > 0; })
      .sort((a, b) => a.due.localeCompare(b.due));
    if (week.length) out.push({ id: "milestones", tone: "soon", title: `Due this week: ${week[0].title}${week.length > 1 ? ` (+${week.length - 1} more)` : ""}`, detail: week[0].description || "Check it off in your checklist once it’s done.", tab: "checklist", cta: "Open checklist" });
  }

  const booked = ledger.shortlist.filter((s) => s.status === "booked").length;
  if (ledger.shortlist.length === 0 && (toGo === undefined || toGo <= 150)) {
    out.push({ id: "shortlist", tone: "tip", title: "Start your vendor shortlist", detail: "Find real venues, caterers and photographers near you and save the ones you like.", tab: "vendors", cta: "Find vendors" });
  } else if (booked === 0 && ledger.shortlist.length > 0 && toGo !== undefined && toGo <= 45) {
    out.push({ id: "book", tone: "soon", title: "No vendor is marked booked yet", detail: `The event is ${toGo} days away — popular venues and caterers fill up. Lock in your key vendors.`, tab: "vendors", cta: "Open vendor pipeline" });
  }

  const high = plan.checklist.flatMap((c) => c.items).filter((i) => i.priority === "high" && !i.completed).length;
  if (high > 0) out.push({ id: "high-tasks", tone: toGo !== undefined && toGo <= 30 ? "soon" : "tip", title: `${high} high-priority task${high === 1 ? "" : "s"} still open`, detail: "These are the ones that cost the most if they slip.", tab: "checklist", cta: "See tasks" });

  if (toGo !== undefined && toGo <= 7) out.push({ id: "runsheet", tone: "soon", title: "Print your day-of run sheet", detail: "Schedule, vendor phone numbers and open tasks on one page for you and your coordinator.", tab: "runsheet", cta: "Open run sheet" });

  return out.sort((a, b) => RANK[a.tone] - RANK[b.tone]).slice(0, max);
}
