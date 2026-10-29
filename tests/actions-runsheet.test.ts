import { describe, expect, it } from "vitest";
import { nextActions } from "../src/lib/actions";
import { buildRunSheet, runSheetToText } from "../src/lib/runsheet";
import { cateringEstimate, inviteMessage, pendingEventsFor, reminderMessage, summarizeRsvps } from "../src/lib/guests";
import type { Guest, Ledger } from "../src/lib/schemas";
import { intake, plan } from "./fixtures";

const empty: Ledger = { expenses: [], shortlist: [] };
const base = { plan, intake: { ...intake, date: "2027-03-20" }, ledger: empty };

describe("nextActions", () => {
  it("is quiet for a past event and caps the list at 4", () => {
    expect(nextActions({ ...base, intake: { ...intake, date: "2020-01-01" }, today: "2026-10-29" })).toEqual([]);
    expect(nextActions({ ...base, today: "2026-10-29" }).length).toBeLessThanOrEqual(4);
  });
  it("puts overdue payments first and names the vendor and amount", () => {
    const ledger: Ledger = { shortlist: [], expenses: [{ id: "1", category: "Venue", vendor: "Shilpa Hall", amount: 100_000, paid: 20_000, dueDate: "2026-10-20" }] };
    const [first] = nextActions({ ...base, ledger, today: "2026-10-29" });
    expect(first.id).toBe("pay-overdue");
    expect(first.tone).toBe("urgent");
    expect(first.title).toContain("Shilpa Hall");
    expect(first.tab).toBe("spend");
  });
  it("flags an overspent category and sends the user to the Copilot", () => {
    const ledger: Ledger = { shortlist: [], expenses: [{ id: "1", category: "Venue", vendor: "X", amount: 99_000_000, paid: 0 }] };
    const a = nextActions({ ...base, ledger, today: "2026-10-29" }).find((x) => x.id === "over-budget");
    expect(a?.tab).toBe("copilot");
  });
  it("suggests a vendor shortlist early, and booking when the date is close", () => {
    expect(nextActions({ ...base, intake: { ...intake, date: "2027-01-10" }, today: "2026-10-29" }).some((a) => a.id === "shortlist")).toBe(true);
    const ledger: Ledger = { expenses: [], shortlist: [{ id: "s", category: "Venue", name: "Hall", status: "quoted" }] };
    expect(nextActions({ ...base, intake: { ...intake, date: "2026-11-30" }, ledger, today: "2026-10-29" }).some((a) => a.id === "book")).toBe(true);
  });
  it("offers the run sheet in the final week", () => {
    expect(nextActions({ ...base, intake: { ...intake, date: "2026-11-02" }, today: "2026-10-29" }).some((a) => a.id === "runsheet")).toBe(true);
  });
});

describe("run sheet", () => {
  const ledger: Ledger = {
    expenses: [{ id: "e", category: "Catering", vendor: "Spice Route", amount: 50_000, paid: 10_000, dueDate: "2026-11-05" }],
    shortlist: [
      { id: "1", category: "Photography", name: "Candid Co", phone: "+91 98765 43210", status: "quoted" },
      { id: "2", category: "Catering", name: "Spice Route", phone: "+91 90000 11111", status: "booked" },
      { id: "3", category: "Decor", name: "Rejected Decor", status: "rejected" },
      { id: "4", category: "DJ", name: "Only Shortlisted", status: "shortlisted" },
    ],
  };
  const rs = buildRunSheet(plan, intake, ledger, "2026-10-29");
  it("lists only booked/quoted vendors, booked first", () => {
    expect(rs.vendors.map((v) => v.name)).toEqual(["Spice Route", "Candid Co"]);
  });
  it("includes the schedule, open high-priority tasks and payments", () => {
    expect(rs.days.length).toBeGreaterThan(0);
    expect(rs.paymentsDue[0]).toMatchObject({ who: "Spice Route", remaining: 40_000, daysLeft: 7 });
  });
  it("renders a WhatsApp-friendly text", () => {
    const t = runSheetToText(rs);
    expect(t).toContain(`*${plan.title}*`);
    expect(t).toContain("*Vendors*");
    expect(t).toContain("Spice Route · +91 90000 11111");
    expect(t).toContain("quote only");
  });
});

const g = (id: string, invited: string[], rsvps: Guest["rsvps"]): Guest => ({ id, eventId: "e", name: id, invited, token: id, rsvps });

describe("RSVP deadline, reminders and catering", () => {
  it("adds the deadline to invitations and reminders only when set", () => {
    expect(inviteMessage({ guestName: "Ravi", eventTitle: "Wedding", link: "https://x/y" })).not.toContain("reply by");
    expect(inviteMessage({ guestName: "Ravi", eventTitle: "Wedding", link: "https://x/y", replyBy: "2026-12-12" })).toContain("reply by 12 Dec 2026");
    const r = reminderMessage({ guestName: "Ravi", eventTitle: "Wedding", link: "https://x/y", pendingEvents: ["Sangeet", "Wedding"], replyBy: "2026-12-12" });
    expect(r).toContain("Sangeet, Wedding");
    expect(r).toContain("12 Dec 2026");
  });
  it("knows which events a guest still owes an answer for", () => {
    expect(pendingEventsFor(g("a", ["Sangeet", "Wedding"], [{ event: "Wedding", status: "yes", partySize: 2 }]))).toEqual(["Sangeet"]);
  });
  it("estimates plates from real RSVPs (confirmed + half the maybes + buffer) and cost per plate", () => {
    const guests = [
      g("a", ["Wedding"], [{ event: "Wedding", status: "yes", partySize: 40 }]),
      g("b", ["Wedding"], [{ event: "Wedding", status: "yes", partySize: 50 }]),
      g("c", ["Wedding"], [{ event: "Wedding", status: "maybe", partySize: 10 }]),
      g("d", ["Wedding"], []),
    ];
    const stats = summarizeRsvps(guests, ["Wedding"]);
    const est = cateringEstimate(stats, { budget: { total: 1_000_000, breakdown: [{ category: "Catering", amount: 300_000, percentage: 30, notes: "", savingTip: "" }] } });
    expect(est).toMatchObject({ confirmed: 90, buffer: 8, plates: 90 + 1 + 8, event: "Wedding", cateringBudget: 300_000 });
    expect(est?.perPlate).toBe(Math.round(300_000 / 99));
  });
  it("returns nothing until someone has said yes or maybe", () => {
    expect(cateringEstimate(summarizeRsvps([g("a", ["Wedding"], [])], ["Wedding"]), plan)).toBeNull();
  });
});
