import type { Guest, RsvpStatus } from "./schemas";

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

export function inviteMessage(opts: { guestName: string; eventTitle: string; link: string }): string {
  return `Namaste ${opts.guestName} 🙏\n\nYou are warmly invited to ${opts.eventTitle}.\nPlease see the details and let us know if you can join us:\n${opts.link}`;
}

export function whatsappUrl(phone: string | undefined, text: string): string {
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}
