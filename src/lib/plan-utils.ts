import { reconcileBudget } from "./budget";
import { addDays, daysBetween, formatDate, phaseLabel } from "./dates";
import { formatINRFull } from "./format";
import type { EventPlan, Intake, StoredPlan } from "./schemas";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const FALLBACK_PALETTE = ["#F59E0B", "#B4234E", "#0F766E", "#FFF1D6"];

export function safePalette(colors: string[] | undefined): string[] {
  const valid = (colors ?? []).map((c) => c?.trim()).filter((c): c is string => !!c && HEX.test(c));
  return valid.length >= 2 ? valid.slice(0, 5) : FALLBACK_PALETTE;
}

/** Make a freshly generated plan safe to store & render. */
export function normalizePlan(
  plan: EventPlan,
  intake: Intake,
  now: Date = new Date(),
  keepProgress = false,
): StoredPlan {
  const { budget, adjusted } = reconcileBudget(plan.budget, intake.budget);
  const timeline = [...plan.timeline].sort((a, b) => b.daysBefore - a.daysBefore);
  return {
    ...plan,
    budget,
    timeline,
    themes: plan.themes.map((t) => ({ ...t, palette: safePalette(t.palette) })),
    checklist: plan.checklist.map((c) => ({
      ...c,
      items: c.items.map((i) => ({ ...i, completed: keepProgress ? i.completed : false })),
    })),
    meta: { budgetAdjusted: adjusted, generatedAt: now.toISOString() },
  };
}

/** After an AI revision, keep ticks on tasks the user already completed. */
export function mergeProgress(oldPlan: EventPlan, newPlan: EventPlan): EventPlan {
  const done = new Set<string>();
  for (const c of oldPlan.checklist) {
    for (const i of c.items) if (i.completed) done.add(i.task.trim().toLowerCase());
  }
  return {
    ...newPlan,
    checklist: newPlan.checklist.map((c) => ({
      ...c,
      items: c.items.map((i) => ({ ...i, completed: i.completed || done.has(i.task.trim().toLowerCase()) })),
    })),
  };
}

type LooseChecklist = { checklist?: ({ items?: ({ completed?: boolean } | undefined | null)[] } | undefined | null)[] };

export function checklistProgress(plan: LooseChecklist | undefined): {
  done: number;
  total: number;
  percent: number;
} {
  let done = 0;
  let total = 0;
  for (const c of plan?.checklist ?? []) {
    for (const i of c?.items ?? []) {
      total++;
      if (i?.completed) done++;
    }
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Plain-text export for WhatsApp / clipboard / navigator.share. */
export function planToText(plan: EventPlan, intake: Intake): string {
  const lines: string[] = [`${plan.title}`, plan.tagline, ""];
  lines.push(plan.summary, "");
  lines.push(`Budget: ${formatINRFull(plan.budget.total)}`);
  for (const b of plan.budget.breakdown) lines.push(`  • ${b.category}: ${formatINRFull(b.amount)} (${b.percentage}%)`);
  lines.push("", "Timeline:");
  for (const t of plan.timeline) {
    const when = intake.date ? formatDate(addDays(intake.date, -t.daysBefore)) : phaseLabel(t.daysBefore);
    lines.push(`  • ${when} — ${t.title}`);
  }
  lines.push("", "Checklist:");
  for (const c of plan.checklist) {
    lines.push(`  ${c.category}`);
    for (const i of c.items) lines.push(`    [${i.completed ? "x" : " "}] ${i.task}`);
  }
  lines.push("", "Planned with Utsava");
  return lines.join("\n");
}

/** The next few not-yet-passed milestones, with real dates — powers the "Up next" card. */
export function upcomingMilestones(
  timeline: { daysBefore?: number; title?: string; description?: string }[] | undefined,
  eventDate: string | undefined,
  today: string,
  count = 3,
): { date: string; daysLeft: number; title: string; description?: string }[] {
  if (!eventDate) return [];
  return (timeline ?? [])
    .filter((t): t is { daysBefore: number; title: string; description?: string } => typeof t?.daysBefore === "number" && !!t.title)
    .map((t) => {
      const date = addDays(eventDate, -t.daysBefore);
      return { date, daysLeft: daysBetween(today, date), title: t.title, description: t.description };
    })
    .filter((t) => t.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, count);
}
