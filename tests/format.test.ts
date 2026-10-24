import { describe, expect, it } from "vitest";
import { formatINR, formatINRFull, parseINR } from "../src/lib/format";

describe("formatINR", () => {
  it("uses lakh/crore compact forms", () => {
    expect(formatINR(2_500_000)).toBe("₹25 L");
    expect(formatINR(12_500_000)).toBe("₹1.25 Cr");
    expect(formatINR(45_000)).toBe("₹45,000");
  });
  it("handles bad input", () => {
    expect(formatINR(undefined)).toBe("₹—");
    expect(formatINR(NaN)).toBe("₹—");
  });
  it("groups the Indian way", () => {
    expect(formatINRFull(1_500_000)).toBe("₹15,00,000");
  });
});

describe("parseINR", () => {
  it.each([
    ["15,00,000", 1_500_000],
    ["₹25L", 2_500_000],
    ["25 lakhs", 2_500_000],
    ["1.5 crore", 15_000_000],
    ["80k", 80_000],
    ["Rs. 50000", 50_000],
  ])("parses %s", (input, expected) => expect(parseINR(input)).toBe(expected));

  it.each(["", "abc", "12 bananas", "-5", "0"])("rejects %j", (input) => expect(parseINR(input)).toBeUndefined());
});
