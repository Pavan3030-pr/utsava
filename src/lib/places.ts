import { geocode, type GeoPoint } from "./geo";
import { PLACE_CATEGORIES, type PlaceCategoryKey, type PlaceResult, type PlacesResponse } from "./place-categories";

const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const UA = "Utsava/1.0 (celebration planner; +https://utsava-weld.vercel.app)";
const TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: PlacesResponse }>();

export class CityNotFoundError extends Error {
  constructor() { super("We couldn’t find that city. Try a bigger nearby city."); this.name = "CityNotFoundError"; }
}

export function buildOverpassQuery(cat: PlaceCategoryKey, lat: number, lon: number, radiusM: number): string {
  const lines = PLACE_CATEGORIES[cat].filters
    .map(([k, v]) => `nwr(around:${Math.round(radiusM)},${lat.toFixed(5)},${lon.toFixed(5)})["${k}"="${v}"]["name"];`)
    .join("\n  ");
  return `[out:json][timeout:20];\n(\n  ${lines}\n);\nout center tags 120;`;
}

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const clean = (s: string | undefined, max: number) => (s ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Only http(s) links ever reach an href. */
export function safeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
  } catch { return undefined; }
}

export function cleanPhone(raw: string | undefined): string | undefined {
  const first = (raw ?? "").split(/[;,/]/)[0]?.replace(/[^\d+\s-]/g, "").trim();
  const digits = (first ?? "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? first : undefined;
}

interface OsmElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export function normalizeElements(elements: OsmElement[], origin: { lat: number; lon: number }, limit = 12): PlaceResult[] {
  const seen = new Set<string>();
  const out: (PlaceResult & { score: number })[] = [];
  for (const el of elements) {
    const t = el.tags ?? {};
    const name = clean(t.name, 120);
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
    if (!name || lat === undefined || lon === undefined) continue;
    const dedupe = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const phone = cleanPhone(t.phone ?? t["contact:phone"] ?? t["contact:mobile"]);
    const website = safeUrl(t.website ?? t["contact:website"]);
    const address = clean(t["addr:full"] ?? [t["addr:housenumber"], t["addr:street"], t["addr:suburb"] ?? t["addr:neighbourhood"], t["addr:city"]].filter(Boolean).join(", "), 160) || undefined;
    out.push({
      name, address, phone, website, lat, lon,
      distanceKm: Math.round(haversineKm(origin.lat, origin.lon, lat, lon) * 10) / 10,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lon}`)}`,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      score: (phone ? 2 : 0) + (website ? 1 : 0),
    });
  }
  return out
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, limit)
    .map((r) => ({ name: r.name, address: r.address, phone: r.phone, website: r.website, lat: r.lat, lon: r.lon, distanceKm: r.distanceKm, mapsUrl: r.mapsUrl, osmUrl: r.osmUrl }));
}

async function overpass(query: string): Promise<{ elements: OsmElement[] }> {
  let lastErr: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(14_000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`overpass ${res.status}`);
      return (await res.json()) as { elements: OsmElement[] };
    } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error("overpass unavailable");
}

export async function searchPlaces(city: string, cat: PlaceCategoryKey, radiusM = 12_000): Promise<PlacesResponse> {
  const key = `${city.trim().toLowerCase()}|${cat}|${radiusM}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const point: GeoPoint | null = await geocode(city);
  if (!point) throw new CityNotFoundError();
  const data = await overpass(buildOverpassQuery(cat, point.lat, point.lon, radiusM));
  const value: PlacesResponse = {
    place: { name: point.region ? `${point.name}, ${point.region}` : point.name, lat: point.lat, lon: point.lon },
    category: cat,
    label: PLACE_CATEGORIES[cat].label,
    results: normalizeElements(data.elements ?? [], point),
    attribution: "© OpenStreetMap contributors (ODbL). Community-maintained — always confirm details and availability.",
  };
  if (cache.size >= 300) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function clearPlacesCache(): void { cache.clear(); }
