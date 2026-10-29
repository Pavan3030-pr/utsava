import { daysBetween } from "./dates";
import { formatINR } from "./format";
import { summarizeLedger } from "./ledger";
import type { EventPlan, Intake, Ledger } from "./schemas";

export interface RunSheet {
  title: string;
  date?: string;
  daysToGo?: number;
  location?: string;
  plannedGuests?: number;
  days: EventPlan["schedule"];
  vendors: { category: string; name: string; phone?: string; status: "booked" | "quoted"; notes?: string }[];
  openTasks: string[];
  paymentsDue: { who: string; remaining: number; daysLeft: number }[];
}

/** Everything a coordinator needs on the day, from data the user already entered. */
export function buildRunSheet(plan: EventPlan, intake: Intake, ledger: Ledger, today: string): RunSheet {
  const vendors = ledger.shortlist
    .filter((s): s is typeof s & { status: "booked" | "quoted" } => s.status === "booked" || s.status === "quoted")
    .sort((a, b) => (a.status === b.status ? a.category.localeCompare(b.category) : a.status === "booked" ? -1 : 1))
    .map((s) => ({ category: s.category, name: s.name, phone: s.phone, status: s.status, notes: s.notes }));
  const openTasks = plan.checklist
    .flatMap((c) => c.items.filter((i) => i.priority === "high" && !i.completed).map((i) => i.task))
    .slice(0, 10);
  const paymentsDue = summarizeLedger(plan.budget.breakdown, ledger.expenses, today, 30).dueSoon
    .slice(0, 6)
    .map((e) => ({ who: e.vendor || e.category, remaining: e.amount - e.paid, daysLeft: e.daysLeft }));
  return {
    title: plan.title, date: intake.date, daysToGo: intake.date ? daysBetween(today, intake.date) : undefined,
    location: intake.location, plannedGuests: intake.guests, days: plan.schedule, vendors, openTasks, paymentsDue,
  };
}

export function runSheetToText(rs: RunSheet): string {
  const L: string[] = [`*${rs.title}* — run sheet`];
  const meta = [rs.date, rs.location, rs.plannedGuests ? `${rs.plannedGuests} guests` : ""].filter(Boolean).join(" · ");
  if (meta) L.push(meta);
  for (const d of rs.days) {
    L.push("", `*${d.day} — ${d.name}*`, ...d.items.map((i) => `${i.time}  ${i.activity}`));
  }
  if (rs.vendors.length) L.push("", "*Vendors*", ...rs.vendors.map((v) => `${v.category}: ${v.name}${v.phone ? ` · ${v.phone}` : ""}${v.status === "quoted" ? " (quote only — not booked)" : ""}`));
  if (rs.openTasks.length) L.push("", "*Still open*", ...rs.openTasks.map((t) => `☐ ${t}`));
  if (rs.paymentsDue.length) L.push("", "*Payments*", ...rs.paymentsDue.map((p) => `${p.who}: ${formatINR(p.remaining)} ${p.daysLeft < 0 ? "overdue" : p.daysLeft === 0 ? "due today" : `due in ${p.daysLeft}d`}`));
  return L.join("\n");
}
