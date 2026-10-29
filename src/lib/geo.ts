/** Server-side geocoding via Open-Meteo (free, keyless). Tiny TTL cache keeps us polite and fast. */
export interface GeoPoint { name: string; lat: number; lon: number; region?: string }

const cache = new Map<string, { at: number; value: GeoPoint | null }>();
const TTL = 24 * 60 * 60 * 1000;
const MAX = 500;

export function geoCandidates(query: string): string[] {
  const q = query.replace(/[<>]/g, " ").replace(/\s+/g, " ").trim();
  const parts = q.split(",").map((p) => p.trim()).filter(Boolean);
  // "Banjara Hills, Hyderabad" → try the city (last segment) before the neighbourhood.
  return [...new Set([q, ...parts.slice().reverse()])].filter((c) => c.length >= 2);
}

export async function geocode(query: string): Promise<GeoPoint | null> {
  const key = query.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  let found: GeoPoint | null = null;
  for (const name of geoCandidates(query).slice(0, 2)) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json&countryCode=IN`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000), cache: "no-store" });
      if (!res.ok) continue;
      const json = (await res.json()) as { results?: { name: string; latitude: number; longitude: number; admin1?: string }[] };
      const r = json.results?.[0];
      if (r && Number.isFinite(r.latitude) && Number.isFinite(r.longitude)) {
        found = { name: r.name, lat: r.latitude, lon: r.longitude, region: r.admin1 };
        break;
      }
    } catch { /* try the next candidate */ }
  }
  if (cache.size >= MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value: found });
  return found;
}

export function clearGeoCache(): void { cache.clear(); }
