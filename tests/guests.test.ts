import { describe, expect, it } from "vitest";
import { eventNames, inviteMessage, normalizePhone, parseBulkGuests, rsvpLink, summarizeRsvps, whatsappUrl } from "../src/lib/guests";
import type { Guest } from "../src/lib/schemas";

const g = (id: string, invited: string[], rsvps: Guest["rsvps"] = []): Guest => ({ id, eventId: "e", name: id, invited, token: `t-${id}`, rsvps });

describe("summarizeRsvps (multi-event)", () => {
  const events = ["Sangeet", "Wedding"];
  const guests = [
    g("a", ["Sangeet", "Wedding"], [{ event: "Sangeet", status: "yes", partySize: 3 }, { event: "Wedding", status: "yes", partySize: 3 }]),
    g("b", ["Wedding"], [{ event: "Wedding", status: "no", partySize: 1 }]),
    g("c", ["Sangeet", "Wedding"], [{ event: "Sangeet", status: "maybe", partySize: 2 }]),
    g("d", ["Wedding"]),
  ];
  const s = summarizeRsvps(guests, events);

  it("counts per event, not per guest", () => {
    expect(s.Sangeet).toEqual({ invited: 2, yes: 1, no: 0, maybe: 1, pending: 0, headcount: 3 });
    expect(s.Wedding).toEqual({ invited: 4, yes: 1, no: 1, maybe: 0, pending: 2, headcount: 3 });
  });
  it("ignores invites to events that no longer exist", () => {
    expect(summarizeRsvps([g("x", ["Ghost"])], events).Sangeet.invited).toBe(0);
  });
});

describe("eventNames", () => {
  it("dedupes and trims", () => {
    expect(eventNames([{ name: " Haldi " }, { name: "Haldi" }, { name: "" }, undefined, { name: "Reception" }])).toEqual(["Haldi", "Reception"]);
  });
});

describe("phones & bulk import", () => {
  it("adds +91 to 10-digit numbers", () => {
    expect(normalizePhone("98765 43210")).toBe("919876543210");
    expect(normalizePhone("+91 98765-43210")).toBe("919876543210");
    expect(normalizePhone("123")).toBeUndefined();
    expect(normalizePhone(undefined)).toBeUndefined();
  });
  it("parses pasted lines", () => {
    const rows = parseBulkGuests("Anita Reddy, 9876543210, Bride’s family\n\n  Ravi \nPriya;9123456780");
    expect(rows).toEqual([
      { name: "Anita Reddy", phone: "919876543210", group: "Bride’s family" },
      { name: "Ravi", phone: undefined, group: undefined },
      { name: "Priya", phone: "919123456780", group: undefined },
    ]);
  });
  it("caps absurd input", () => {
    expect(parseBulkGuests("x\n".repeat(1000), 50)).toHaveLength(50);
  });
});

describe("invite links", () => {
  it("builds a personal link and WhatsApp URL", () => {
    const link = rsvpLink("https://utsava.app/", "abc");
    expect(link).toBe("https://utsava.app/rsvp/abc");
    const url = whatsappUrl("919876543210", inviteMessage({ guestName: "Anita", eventTitle: "Priya & Rahul", link }));
    expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("https://utsava.app/rsvp/abc");
  });
});
