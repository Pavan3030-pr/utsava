import { describe, expect, it } from "vitest";
import { buildIcs } from "../src/lib/ics";
import { plan } from "./fixtures";

const ics = buildIcs({
  uidSeed: "abc", title: "Priya & Rahul", eventDate: "2027-02-14",
  timeline: plan.timeline, now: new Date("2026-10-24T10:00:00Z"),
});

describe("buildIcs", () => {
  it("is a well-formed calendar with CRLF endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });
  it("places events relative to the event date", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20270214"); // day 0
    expect(ics).toContain("DTSTART;VALUE=DATE:20261116"); // 90 days before
    expect(ics).toContain("DTSTAMP:20261024T100000Z");
  });
  it("escapes commas/semicolons and folds long lines", () => {
    expect(ics).toContain("Deposit\\, due");
    const long = buildIcs({ uidSeed: "x", title: "T", eventDate: "2027-02-14", timeline: [{ daysBefore: 1, title: "x".repeat(200) }] });
    for (const line of long.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("adds an event-day entry when the plan has none", () => {
    const out = buildIcs({ uidSeed: "x", title: "T", eventDate: "2027-02-14", timeline: [{ daysBefore: 5, title: "a" }] });
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
});
