import { addDays, daysBetween, todayIso } from "./dates";
import { geocode } from "./geo";

export interface WeatherResult {
  mode: "forecast" | "climate";
  place: string;
  date: string;
  maxC: number;
  minC: number;
  /** % chance of rain: model probability (forecast) or share of rainy days in past years (climate) */
  rainChance: number;
  rainMm: number;
  sampleDays?: number;
  advice: string[];
  source: string;
}

const cache = new Map<string, { at: number; value: WeatherResult }>();

export function weatherAdvice(w: { rainChance: number; maxC: number; minC: number }): string[] {
  const tips: string[] = [];
  if (w.rainChance >= 60) tips.push("High chance of rain — book a covered or indoor venue, or a waterproof tent with flooring, and keep a rain plan for the baraat and photos.");
  else if (w.rainChance >= 30) tips.push("Showers are possible — keep a covered backup for outdoor rituals, and arrange umbrellas and non-slip mats.");
  else tips.push("Rain looks unlikely — still keep a small contingency tent for the main stage.");
  if (w.maxC >= 38) tips.push("Very hot — schedule outdoor rituals before 10:30am or after 4:30pm, arrange coolers, water stations and shaded seating for elders.");
  else if (w.maxC >= 34) tips.push("Warm afternoons — plan cold drinks on arrival and keep outdoor segments short.");
  if (w.minC <= 12) tips.push("Chilly evenings — arrange heaters or shawls for night functions and warm drinks.");
  return tips;
}

const SOURCE_FORECAST = "Open-Meteo forecast";
const SOURCE_CLIMATE = "Open-Meteo historical weather (same dates, last 5 years)";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`weather ${res.status}`);
  return (await res.json()) as T;
}

interface Daily { time?: string[]; temperature_2m_max?: (number | null)[]; temperature_2m_min?: (number | null)[]; precipitation_sum?: (number | null)[]; precipitation_probability_max?: (number | null)[] }

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const num = (xs: (number | null | undefined)[] | undefined): number[] => (xs ?? []).filter((x): x is number => typeof x === "number" && Number.isFinite(x));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarizeClimate(windows: Daily[], rainDayMm = 2.5): { maxC: number; minC: number; rainChance: number; rainMm: number; sampleDays: number } | null {
  const maxes: number[] = [], mins: number[] = [], rains: number[] = [];
  for (const d of windows) { maxes.push(...num(d.temperature_2m_max)); mins.push(...num(d.temperature_2m_min)); rains.push(...num(d.precipitation_sum)); }
  if (maxes.length === 0 || rains.length === 0) return null;
  return {
    maxC: round1(avg(maxes)), minC: round1(avg(mins)),
    rainChance: Math.round((rains.filter((r) => r >= rainDayMm).length / rains.length) * 100),
    rainMm: round1(avg(rains)), sampleDays: rains.length,
  };
}

/** Same calendar date (±3 days) in each of the last 5 years. */
export function historicalWindows(date: string, years = 5, spread = 3): { start: string; end: string }[] {
  const [y, m, d] = date.split("-").map(Number);
  return Array.from({ length: years }, (_, i) => {
    const centre = new Date(Date.UTC(y - 1 - i, m - 1, d)).toISOString().slice(0, 10);
    return { start: addDays(centre, -spread), end: addDays(centre, spread) };
  });
}

export async function getWeather(city: string, date: string, today = todayIso()): Promise<WeatherResult | null> {
  const ahead = daysBetween(today, date);
  if (ahead < 0) return null;
  const key = `${city.trim().toLowerCase()}|${date}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (ahead <= 15 ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000)) return hit.value;

  const point = await geocode(city);
  if (!point) return null;
  const place = point.region ? `${point.name}, ${point.region}` : point.name;
  let value: WeatherResult | null = null;

  if (ahead <= 15) {
    const j = await getJson<{ daily?: Daily }>(
      `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto&start_date=${date}&end_date=${date}`,
    );
    const maxC = num(j.daily?.temperature_2m_max)[0], minC = num(j.daily?.temperature_2m_min)[0];
    if (maxC !== undefined && minC !== undefined) {
      const rainChance = num(j.daily?.precipitation_probability_max)[0] ?? 0;
      value = { mode: "forecast", place, date, maxC: round1(maxC), minC: round1(minC), rainChance, rainMm: round1(num(j.daily?.precipitation_sum)[0] ?? 0), advice: [], source: SOURCE_FORECAST };
    }
  } else {
    const settled = await Promise.allSettled(
      historicalWindows(date).map((w) =>
        getJson<{ daily?: Daily }>(`https://archive-api.open-meteo.com/v1/archive?latitude=${point.lat}&longitude=${point.lon}&start_date=${w.start}&end_date=${w.end}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`),
      ),
    );
    const windows = settled.flatMap((s) => (s.status === "fulfilled" && s.value.daily ? [s.value.daily] : []));
    const c = summarizeClimate(windows);
    if (c) value = { mode: "climate", place, date, ...c, advice: [], source: SOURCE_CLIMATE };
  }

  if (!value) return null;
  value.advice = weatherAdvice(value);
  if (cache.size >= 300) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function clearWeatherCache(): void { cache.clear(); }
