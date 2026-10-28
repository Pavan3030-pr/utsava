import type { EventPlan, Guest, ShortlistItem } from "./schemas";

/* ───────────────────────────── text matching ───────────────────────────── */

const STOP = new Set(["the", "a", "an", "and", "for", "to", "of", "with", "in", "on", "at", "your", "our", "all", "any"]);

/** Lower-case, punctuation-free, whitespace-collapsed. Keeps letters/digits/marks of every Indian script. */
export function normKey(s: string | undefined | null): string {
  return (s ?? "").toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

const tokens = (s: string): Set<string> => new Set(normKey(s).split(" ").filter((t) => t && !STOP.has(t)));

/**
 * "Same thing" = identical after normalisation, or (for phrases of 3+ meaningful words) ≥ 80 % word overlap.
 * Catches "Book the caterer" / "Book caterer!" without merging "Book DJ" / "Book decorator".
 */
export function sameThing(a: string | undefined | null, b: string | undefined | null): boolean {
  const ka = normKey(a), kb = normKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const ta = tokens(ka), tb = tokens(kb);
  if (ta.size < 3 || tb.size < 3) return false;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared) >= 0.8;
}

/** Keeps the first occurrence; `merge` can fold a duplicate's useful data into the keeper. */
export function uniqueBy<T>(items: T[], text: (t: T) => string, merge?: (keep: T, dup: T) => T, same = sameThing): { items: T[]; removed: number } {
  const out: T[] = [];
  let removed = 0;
  for (const item of items) {
    const i = out.findIndex((k) => same(text(k), text(item)));
    if (i === -1) out.push(item);
    else { removed++; if (merge) out[i] = merge(out[i], item); }
  }
  return { items: out, removed };
}

const uniqueStrings = (xs: string[]): { items: string[]; removed: number } => uniqueBy(xs, (s) => s);

/* ───────────────────────────── generated plans ───────────────────────────── */

const RANK = { high: 3, medium: 2, low: 1 } as const;

export interface DedupeResult<P> { plan: P; removed: number }

/** Removes repeated budget lines, tasks, vendors, milestones, schedule items, themes, notes and risks. */
export function dedupePlan<P extends EventPlan>(plan: P): DedupeResult<P> {
  let removed = 0;
  const take = <T,>(r: { items: T[]; removed: number }): T[] => { removed += r.removed; return r.items; };

  // Budget: duplicate category names are merged (amounts add up, so the total is unchanged).
  const breakdown = take(uniqueBy(plan.budget.breakdown, (b) => b.category, (k, d) => ({
    ...k, amount: k.amount + d.amount, notes: k.notes || d.notes, savingTip: k.savingTip || d.savingTip,
  })));

  // Milestones: a repeat only counts when it is on the same day.
  const tl = dedupeTimelineByDay(plan.timeline);
  removed += tl.removed;
  const timelineFinal = tl.items;

  // Checklist: merge same-named categories, then drop repeated tasks across ALL categories.
  const mergedCats = take(uniqueBy(plan.checklist, (c) => c.category, (k, d) => ({ ...k, items: [...k.items, ...d.items] })));
  const seenTasks: { task: string; ci: number; ii: number }[] = [];
  const checklist = mergedCats.map((c) => ({ ...c, items: [...c.items] }));
  const drop = new Set<string>();
  checklist.forEach((c, ci) => c.items.forEach((item, ii) => {
    const first = seenTasks.find((s) => sameThing(s.task, item.task));
    if (!first) { seenTasks.push({ task: item.task, ci, ii }); return; }
    const keep = checklist[first.ci].items[first.ii];
    keep.completed = keep.completed || item.completed;
    if (RANK[item.priority] > RANK[keep.priority]) keep.priority = item.priority;
    drop.add(`${ci}:${ii}`);
    removed++;
  }));
  const checklistFinal = checklist
    .map((c, ci) => ({ ...c, items: c.items.filter((_, ii) => !drop.has(`${ci}:${ii}`)) }))
    .filter((c) => c.items.length > 0);

  const vendors = take(uniqueBy(plan.vendors, (v) => v.category, (k, d) => ({
    ...k,
    whatToLookFor: k.whatToLookFor || d.whatToLookFor,
    estimatedRange: k.estimatedRange || d.estimatedRange,
    bookBy: k.bookBy || d.bookBy,
    questionsToAsk: take(uniqueStrings([...k.questionsToAsk, ...d.questionsToAsk])).slice(0, 5),
  })));

  // Schedule: same event + same day → one entry; identical items inside an entry collapse.
  const schedule = take(uniqueBy(plan.schedule, (s) => `${s.day} ${s.name}`, (k, d) => ({ ...k, vibe: k.vibe || d.vibe, items: [...k.items, ...d.items] })))
    .map((s) => ({ ...s, items: take(uniqueBy(s.items, (i) => `${i.time} ${i.activity}`)) }));

  const themes = take(uniqueBy(plan.themes, (t) => t.name)).map((t) => ({
    ...t,
    decor: take(uniqueStrings(t.decor)),
    palette: take(uniqueBy(t.palette, (c) => c, undefined, (a, b) => normKey(a) === normKey(b) && !!normKey(a))),
  }));

  const culturalNotes = take(uniqueStrings(plan.culturalNotes));
  const risks = take(uniqueBy(plan.risks, (r) => r.risk, (k, d) => ({ ...k, mitigation: k.mitigation || d.mitigation })));

  return {
    plan: { ...plan, budget: { ...plan.budget, breakdown }, timeline: timelineFinal, checklist: checklistFinal, vendors, schedule, themes, culturalNotes, risks },
    removed,
  };
}

function dedupeTimelineByDay(timeline: EventPlan["timeline"]): { items: EventPlan["timeline"]; removed: number } {
  const out: EventPlan["timeline"] = [];
  let removed = 0;
  for (const t of timeline) {
    const i = out.findIndex((k) => k.daysBefore === t.daysBefore && sameThing(k.title, t.title));
    if (i === -1) out.push(t);
    else { removed++; out[i] = { ...out[i], description: out[i].description || t.description }; }
  }
  return { items: out, removed };
}

/* ───────────────────────────── guests ───────────────────────────── */

export interface GuestInput { name: string; phone?: string; group?: string; diet?: string }
type GuestLike = { name: string; phone?: string };

/** Same person = same phone number; if either side has no phone, same normalised name. */
export function sameGuest(a: GuestLike, b: GuestLike): boolean {
  if (a.phone && b.phone) return a.phone === b.phone;
  return normKey(a.name) !== "" && normKey(a.name) === normKey(b.name);
}

export interface ImportPlan {
  toInsert: GuestInput[];
  /** existing guests that should simply be invited to extra events */
  toUpdate: { id: string; invited: string[] }[];
  skipped: number;
}

/** Decide what a pasted guest list should actually do: add new people, widen invites, skip repeats. */
export function planGuestImport(existing: Guest[], incoming: GuestInput[], invited: string[]): ImportPlan {
  const toInsert: GuestInput[] = [];
  const updates = new Map<string, Set<string>>();
  let skipped = 0;

  for (const g of incoming) {
    const batchHit = toInsert.findIndex((x) => sameGuest(x, g));
    if (batchHit !== -1) {
      skipped++;
      const keep = toInsert[batchHit];
      toInsert[batchHit] = { ...keep, phone: keep.phone ?? g.phone, group: keep.group ?? g.group, diet: keep.diet ?? g.diet };
      continue;
    }
    const match = existing.find((e) => sameGuest(e, g));
    if (!match) { toInsert.push(g); continue; }
    const have = new Set(updates.get(match.id) ?? match.invited);
    const missing = invited.filter((e) => !have.has(e));
    if (missing.length === 0) { skipped++; continue; }
    missing.forEach((e) => have.add(e));
    updates.set(match.id, have);
  }
  return { toInsert, toUpdate: [...updates].map(([id, set]) => ({ id, invited: [...set] })), skipped };
}

export interface DuplicateGroup { keep: Guest; remove: Guest[]; invited: string[] }

/** Existing repeats in a saved guest list. The guest who already has RSVPs is kept. */
export function findDuplicateGuests(guests: Guest[]): DuplicateGroup[] {
  const used = new Set<string>();
  const groups: DuplicateGroup[] = [];
  guests.forEach((g, i) => {
    if (used.has(g.id)) return;
    const dupes = guests.slice(i + 1).filter((o) => !used.has(o.id) && sameGuest(g, o));
    if (dupes.length === 0) return;
    const all = [g, ...dupes];
    all.forEach((x) => used.add(x.id));
    const keep = [...all].sort((a, b) => b.rsvps.length - a.rsvps.length)[0];
    groups.push({ keep, remove: all.filter((x) => x.id !== keep.id), invited: [...new Set(all.flatMap((x) => x.invited))] });
  });
  return groups;
}

/* ───────────────────────────── vendors ───────────────────────────── */

export function isDuplicateVendor(list: ShortlistItem[], name: string, category: string): boolean {
  return list.some((s) => normKey(s.name) === normKey(name) && normKey(s.category) === normKey(category));
}
