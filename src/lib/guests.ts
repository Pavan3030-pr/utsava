import { formatDate } from "./dates";
import type { EventPlan, Guest, Ledger, RsvpStatus } from "./schemas";

export interface EventStats {
  invited: number;
  yes: number;
  no: number;
  maybe: number;
  pending: number;
  /** confirmed heads (sum of party sizes of "yes") */
  headcount: number;
}

/** Unique sub-event names from the plan's schedule — the columns of the guest × event matrix. */
export function eventNames(schedule: ({ name?: string } | undefined | null)[] | undefined): string[] {
  const seen = new Set<string>();
  for (const s of schedule ?? []) {
    const n = s?.name?.trim();
    if (n) seen.add(n);
  }
  return [...seen];
}

export function summarizeRsvps(guests: Guest[], events: string[]): Record<string, EventStats> {
  const out: Record<string, EventStats> = {};
  for (const e of events) out[e] = { invited: 0, yes: 0, no: 0, maybe: 0, pending: 0, headcount: 0 };
  for (const g of guests) {
    for (const e of g.invited) {
      const s = out[e];
      if (!s) continue;
      s.invited++;
      const r = g.rsvps.find((x) => x.event === e);
      if (!r) s.pending++;
      else {
        s[r.status as RsvpStatus]++;
        if (r.status === "yes") s.headcount += r.partySize;
      }
    }
  }
  return out;
}

/** "Name, phone, group" per line → guests. Ignores blanks and over-long lines. */
export function parseBulkGuests(text: string, max = 300): { name: string; phone?: string; group?: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((line) => {
      const [name, phone, group] = line.split(/[,\t;]/).map((p) => p.trim());
      return { name: name.slice(0, 120), phone: normalizePhone(phone), group: group?.slice(0, 60) || undefined };
    })
    .filter((g) => g.name.length > 0);
}

/** Digits only; 10-digit Indian numbers get +91. Returns undefined if it doesn't look like a phone. */
export function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return undefined;
}

export function rsvpLink(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/rsvp/${token}`;
}

export function inviteMessage(opts: { guestName: string; eventTitle: string; link: string; replyBy?: string }): string {
  const by = opts.replyBy ? `\nKindly reply by ${formatDate(opts.replyBy)}.` : "";
  return `Namaste ${opts.guestName} 🙏\n\nYou are warmly invited to ${opts.eventTitle}.\nPlease see the details and let us know if you can join us:\n${opts.link}${by}`;
}

/** Gentle nudge for guests who haven't answered; names the events still open. */
export function reminderMessage(opts: { guestName: string; eventTitle: string; link: string; pendingEvents: string[]; replyBy?: string; today?: string }): string {
  const what = opts.pendingEvents.length ? ` for ${opts.pendingEvents.join(", ")}` : "";
  const by = opts.replyBy ? ` We’d be grateful if you could reply by ${formatDate(opts.replyBy)}.` : "";
  return `Namaste ${opts.guestName} 🙏\n\nA gentle reminder about ${opts.eventTitle} — we haven’t heard from you yet${what}.${by}\nIt takes 20 seconds:\n${opts.link}`;
}

/** Events a guest has been invited to but not answered. */
export function pendingEventsFor(g: Guest): string[] {
  return g.invited.filter((e) => !g.rsvps.some((r) => r.event === e));
}

export interface CateringEstimate {
  /** plates to order for the busiest event: confirmed + half the "maybe" + a buffer for walk-ins */
  plates: number;
  confirmed: number;
  buffer: number;
  /** catering budget ÷ plates, if the plan has a catering line */
  perPlate?: number;
  cateringBudget?: number;
  event: string;
}

/** Real RSVP numbers → how many plates to order and what each costs. */
export function cateringEstimate(stats: Record<string, EventStats>, plan: Pick<EventPlan, "budget">, ledger?: Pick<Ledger, "expenses">): CateringEstimate | null {
  const entries = Object.entries(stats).filter(([, s]) => s.invited > 0);
  if (entries.length === 0) return null;
  const [event, s] = entries.sort((a, b) => b[1].headcount + b[1].maybe - (a[1].headcount + a[1].maybe))[0];
  const base = s.headcount + Math.ceil(s.maybe / 2);
  if (base === 0) return null;
  const buffer = Math.max(3, Math.ceil(base * 0.08));
  const plates = base + buffer;
  const line = plan.budget.breakdown.find((b) => /cater|food|menu/i.test(b.category));
  const committed = (ledger?.expenses ?? []).filter((e) => /cater|food|menu/i.test(e.category)).reduce((n, e) => n + e.amount, 0);
  const cateringBudget = line ? Math.max(line.amount, committed) : committed || undefined;
  return { plates, confirmed: s.headcount, buffer, event, cateringBudget, perPlate: cateringBudget ? Math.round(cateringBudget / plates) : undefined };
}

export function whatsappUrl(phone: string | undefined, text: string): string {
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}

/** Spreadsheet-safe CSV (neutralises =,+,-,@ formula injection; quotes commas/quotes/newlines). */
export function csvCell(value: string | number | undefined): string {
  let s = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function guestsToCsv(guests: Guest[], events: string[]): string {
  const header = ["Name", "Phone", "Group", ...events.flatMap((e) => [`${e} RSVP`, `${e} heads`])];
  const rows = guests.map((g) => [
    g.name, g.phone ?? "", g.group ?? "",
    ...events.flatMap((e) => {
      if (!g.invited.includes(e)) return ["not invited", ""];
      const r = g.rsvps.find((x) => x.event === e);
      return r ? [r.status, r.status === "yes" ? r.partySize : ""] : ["waiting", ""];
    }),
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Guests who haven't answered for at least one event they're invited to. */
export function guestsWaiting(guests: Guest[]): Guest[] {
  return guests.filter((g) => g.invited.some((e) => !g.rsvps.some((r) => r.event === e)));
}
