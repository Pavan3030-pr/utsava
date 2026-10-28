import { z } from "zod";
import { formatINR } from "../format";
import { LANGUAGES, PART_SCHEMAS, PLAN_PARTS, type EventPlan, type Intake, type PlanPart } from "../schemas";
import { PLANNER_SYSTEM, sanitizeField } from "./prompts";

/**
 * Copilot speed: most instructions touch one or two parts of the plan. Sending (and asking the model to
 * rewrite) only those parts cuts input and output tokens — the two things that dominate latency.
 * When in doubt we fall back to every part, so correctness never depends on this heuristic.
 */
const RULES: { re: RegExp; parts: PlanPart[] }[] = [
  // money
  { re: /budget|cost|cheap|expens|afford|saving|\bsave\b|reduce|\bcut\b|lakh|crore|₹|\brs\b|rupee|price|premium|luxur|lavish|splurge|\d\s?%|\d+\s?k\b/i, parts: ["core", "ops"] },
  // timing & structure
  { re: /schedule|timing|timeline|morning|evening|night|afternoon|reception|sangeet|mehendi|mehndi|haldi|muhurat|baraat|reschedul|\bmove\b|earlier|later|shorten|extend|extra day|one day|two day/i, parts: ["schedule"] },
  // food, people, logistics
  { re: /menu|food|vegetarian|vegan|jain|catering|diet|allerg|kids?|child|elder|wheelchair|accessib|parking|transport|vendor|photograph|\bdj\b|band|decorator|hire|book\b/i, parts: ["ops", "schedule"] },
  // look, feel, words
  { re: /theme|colou?r|style|tradition|modern|eco|sustainab|invitation|invite|language|translate|tone|cultural|ritual|decor/i, parts: ["ideas", "ops"] },
];
/** Whole-plan changes */
const EVERYTHING = /rain|weather|monsoon|heat|summer|winter|outdoor|indoor|postpone|cancel|complete(ly)?|from scratch|redo|redesign|overhaul|destination|smaller|bigger|scale/i;

export function detectScope(instruction: string): PlanPart[] {
  if (EVERYTHING.test(instruction)) return [...PLAN_PARTS];
  const hit = new Set<PlanPart>();
  for (const r of RULES) if (r.re.test(instruction)) r.parts.forEach((p) => hit.add(p));
  if (hit.size === 0 || hit.size >= 3) return [...PLAN_PARTS];
  return PLAN_PARTS.filter((p) => hit.has(p));
}

/** The exact fields of one part, taken from the full plan. */
export function slicePlan(plan: EventPlan, parts: readonly PlanPart[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const part of parts) {
    for (const key of Object.keys(PART_SCHEMAS[part].shape)) out[key] = (plan as unknown as Record<string, unknown>)[key];
  }
  return out;
}

/** One-line-per-part summary of the parts the model is NOT allowed to change (context without the tokens). */
export function digest(plan: EventPlan, parts: readonly PlanPart[]): string[] {
  const lines: string[] = [];
  for (const p of parts) {
    if (p === "core") lines.push(`- budget ${formatINR(plan.budget.total)}: ${plan.budget.breakdown.map((b) => `${b.category} ${formatINR(b.amount)}`).join(", ")}`);
    if (p === "schedule") lines.push(`- events: ${[...new Set(plan.schedule.map((s) => s.name))].join(", ")}; ${plan.timeline.length} timeline milestones`);
    if (p === "ops") lines.push(`- checklist: ${plan.checklist.map((c) => `${c.category} (${c.items.length})`).join(", ")}; vendors: ${plan.vendors.map((v) => v.category).join(", ")}`);
    if (p === "ideas") lines.push(`- themes: ${plan.themes.map((t) => t.name).join(", ")}; ${plan.risks.length} risks noted`);
  }
  return lines;
}

/** Response schema limited to the parts that may change. `reply` first so it streams to the user at once. */
export function buildRefineSchema(scope: readonly PlanPart[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const p of scope) shape[p] = PART_SCHEMAS[p].optional();
  return z.object({
    reply: z.string().describe("Friendly 1-2 sentence answer to the user"),
    changes: z.array(z.string()).describe("2-5 short bullets describing what changed, with INR figures where relevant"),
    updates: z.object(shape).describe("Include a part ONLY if it must change; each included part must be complete"),
  });
}

export const COPILOT_SYSTEM = `${PLANNER_SYSTEM}

YOU ARE NOW REVISING AN EXISTING PLAN
- Apply the user's instruction. Put "reply" FIRST (1-2 friendly sentences), then "changes", then "updates".
- "updates" may contain ONLY the parts listed under EDITABLE PARTS. core = title/tagline/summary/budget; schedule = schedule/timeline; ops = checklist/vendors; ideas = themes/culturalNotes/risks/invitation. Include a part only if it must change, and return it complete.
- Change only what the instruction requires, plus what must follow from it. Use READ-ONLY CONTEXT to keep numbers and names consistent (e.g. a budget cut must stay consistent with the vendor ranges you rewrite).
- Never repeat an item that already exists: no duplicate tasks, vendors, budget lines, schedule items or milestones.
- Keep unaffected checklist wording identical so the user's progress is preserved. Keep text tight: no sentence over 25 words.
- Earlier turns are context only. If the instruction is impossible or unsafe, change nothing and explain in "reply".`;

export function buildCopilotPrompt(
  intake: Intake, plan: EventPlan, instruction: string, today: string, scope: readonly PlanPart[],
  history: { instruction: string; reply: string }[] = [],
): string {
  const rest = PLAN_PARTS.filter((p) => !scope.includes(p));
  const past = history.length
    ? `\nEARLIER TURNS (context only):\n${history.map((h) => `- user: ${sanitizeField(h.instruction, 300)} → you: ${sanitizeField(h.reply, 400)}`).join("\n")}\n`
    : "";
  return `today: ${today}
output language: ${LANGUAGES[intake.language]}
event date: ${intake.date ?? "unspecified"}
guests: ${intake.guests ?? "unspecified"}
requested budget: ${intake.budget ? formatINR(intake.budget) : "flexible"}

EDITABLE PARTS: ${scope.join(", ")}
${JSON.stringify(slicePlan(plan, scope))}
${rest.length ? `\nREAD-ONLY CONTEXT (do not return these):\n${digest(plan, rest).join("\n")}\n` : ""}${past}
<user_input>
${sanitizeField(instruction, 500)}
</user_input>`;
}
