import { addDays } from "./dates";

export interface IcsTimelineItem {
  daysBefore: number;
  title: string;
  description?: string;
}

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 requires lines ≤ 75 octets; continuation lines start with a space. */
const bytes = (s: string) => new TextEncoder().encode(s).length;

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (bytes(rest) > 75) {
    let cut = 75;
    while (bytes(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

const compact = (iso: string) => iso.replace(/-/g, "");

/** Builds an all-day-event calendar of the planning timeline (importable into Google/Apple Calendar). */
export function buildIcs(opts: {
  uidSeed: string;
  title: string;
  eventDate: string;
  timeline: IcsTimelineItem[];
  now?: Date;
}): string {
  const stamp = (opts.now ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Utsava//Event Planner//EN", "CALSCALE:GREGORIAN"];

  const events = [
    ...opts.timeline.map((t) => ({ date: addDays(opts.eventDate, -t.daysBefore), summary: `${opts.title}: ${t.title}`, desc: t.description ?? "" })),
  ];
  if (!opts.timeline.some((t) => t.daysBefore === 0)) {
    events.push({ date: opts.eventDate, summary: `🎉 ${opts.title}`, desc: "The big day!" });
  }

  events.forEach((e, i) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${opts.uidSeed}-${i}@utsava`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`,
      `SUMMARY:${esc(e.summary)}`,
      `DESCRIPTION:${esc(e.desc)}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
