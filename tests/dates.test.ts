import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatDate, phaseLabel, todayIso } from "../src/lib/dates";

describe("dates", () => {
  it("adds and subtracts days across month/leap boundaries", () => {
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("counts days between", () => {
    expect(daysBetween("2026-10-24", "2027-02-14")).toBe(113);
    expect(daysBetween("2027-02-14", "2027-02-10")).toBe(-4);
  });
  it("formats", () => {
    expect(formatDate("2027-02-14")).toContain("2027");
    expect(todayIso(new Date(2026, 9, 24))).toBe("2026-10-24");
  });
  it("labels phases", () => {
    expect(phaseLabel(90)).toBe("D-90");
    expect(phaseLabel(0)).toBe("Event day");
    expect(phaseLabel(-2)).toBe("D+2");
  });
});
