/** Indian-style compact currency: ₹1.2 Cr, ₹6.5 L, ₹45,000 */
export function formatINR(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "₹—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)} Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
}

/** Full Indian grouping: ₹15,00,000 */
export function formatINRFull(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "₹—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function trim(x: number): string {
  return x.toFixed(2).replace(/\.?0+$/, "");
}

const MULTIPLIERS: Record<string, number> = {
  cr: 1e7, crore: 1e7, crores: 1e7,
  l: 1e5, lac: 1e5, lacs: 1e5, lakh: 1e5, lakhs: 1e5,
  k: 1e3, thousand: 1e3,
};

/** "15,00,000" | "25L" | "1.5 crore" | "₹80k" → number (INR). Undefined if unparseable. */
export function parseINR(input: string | undefined | null): number | undefined {
  if (!input) return undefined;
  const s = input.toLowerCase().replace(/₹|rs\.?|inr|,|\s/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)([a-z]+)?$/);
  if (!m) return undefined;
  const mult = m[2] ? MULTIPLIERS[m[2]] : 1;
  if (!mult) return undefined;
  const value = Math.round(parseFloat(m[1]) * mult);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
