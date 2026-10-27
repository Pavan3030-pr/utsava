import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { categoryKey } from "../src/lib/place-categories";
import { clearGeoCache, geoCandidates } from "../src/lib/geo";
import { buildOverpassQuery, cleanPhone, clearPlacesCache, normalizeElements, safeUrl, searchPlaces, CityNotFoundError } from "../src/lib/places";
import { clearWeatherCache, getWeather, historicalWindows, summarizeClimate, weatherAdvice } from "../src/lib/weather";
import { csvCell, guestsToCsv, guestsWaiting } from "../src/lib/guests";
import type { Guest } from "../src/lib/schemas";

describe("category mapping", () => {
  it.each([
    ["Photography & videography", "photography"], ["Catering", "catering"], ["Venue / banquet hall", "venue"],
    ["Decor & florals", "decor"], ["Mehendi artist", "beauty"], ["Priest / pandit", "worship"], ["Guest accommodation", "stay"],
  ])("%s → %s", (label, key) => expect(categoryKey(label)).toBe(key));
  it("returns null where OpenStreetMap can't help", () => {
    expect(categoryKey("DJ & sound")).toBeNull();
    expect(categoryKey("")).toBeNull();
  });
});

describe("geocoding candidates", () => {
  it("tries the whole string, then city before neighbourhood", () => {
    expect(geoCandidates("Banjara Hills, Hyderabad")).toEqual(["Banjara Hills, Hyderabad", "Hyderabad", "Banjara Hills"]);
    expect(geoCandidates("Pune")).toEqual(["Pune"]);
  });
});

describe("OpenStreetMap normalisation", () => {
  const origin = { lat: 17.385, lon: 78.4867 };
  it("builds a bounded Overpass query with every filter", () => {
    const q = buildOverpassQuery("venue", 17.385, 78.4867, 12000);
    expect(q).toContain('["amenity"="events_venue"]');
    expect(q).toContain("around:12000");
    expect(q).toContain("out center tags");
  });
  it("only allows http(s) links and sane phone numbers", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("example.com/hall")).toBe("https://example.com/hall");
    expect(cleanPhone("+91 98765 43210; 040 1234")).toBe("+91 98765 43210");
    expect(cleanPhone("call us")).toBeUndefined();
  });
  it("drops unnamed places, dedupes, strips markup, and ranks contactable ones first", () => {
    const out = normalizeElements([
      { type: "node", id: 1, lat: 17.40, lon: 78.49, tags: { name: "Far Hall" } },
      { type: "way", id: 2, center: { lat: 17.386, lon: 78.487 }, tags: { name: "<b>Near</b> Hall", phone: "+91 98765 43210", website: "javascript:x", "addr:street": "MG Road", "addr:city": "Hyderabad" } },
      { type: "node", id: 3, lat: 17.386, lon: 78.487, tags: {} },
      { type: "node", id: 4, lat: 17.40, lon: 78.49, tags: { name: "Far Hall" } },
    ], origin);
    expect(out.map((p) => p.name)).toEqual(["b Near /b Hall", "Far Hall"]);
    expect(out[0].name).not.toMatch(/[<>]/);
    expect(out[0].phone).toBe("+91 98765 43210");
    expect(out[0].website).toBeUndefined();
    expect(out[0].address).toBe("MG Road, Hyderabad");
    expect(out).toHaveLength(2);
    expect(out[0].osmUrl).toBe("https://www.openstreetmap.org/way/2");
  });
});

describe("searchPlaces / getWeather with mocked network", () => {
  beforeEach(() => { clearGeoCache(); clearPlacesCache(); clearWeatherCache(); });
  afterEach(() => vi.unstubAllGlobals());

  const geoOk = { results: [{ name: "Hyderabad", latitude: 17.38, longitude: 78.48, admin1: "Telangana" }] };
  const route = (map: Record<string, unknown>) =>
    vi.fn(async (url: string | URL) => {
      const u = String(url);
      const hit = Object.keys(map).find((k) => u.includes(k));
      if (!hit) return new Response("{}", { status: 404 });
      return new Response(JSON.stringify(map[hit]));
    });

  it("finds real places for a city", async () => {
    vi.stubGlobal("fetch", route({
      "geocoding-api": geoOk,
      "overpass-api": { elements: [{ type: "node", id: 9, lat: 17.39, lon: 78.49, tags: { name: "Shilpa Convention", phone: "+91 40 1234 5678" } }] },
    }));
    const r = await searchPlaces("Hyderabad", "venue");
    expect(r.place.name).toBe("Hyderabad, Telangana");
    expect(r.results[0].name).toBe("Shilpa Convention");
  });
  it("fails clearly for unknown cities and falls back to the mirror when Overpass is down", async () => {
    vi.stubGlobal("fetch", route({ "geocoding-api": { results: [] } }));
    await expect(searchPlaces("Nowheresville", "venue")).rejects.toBeInstanceOf(CityNotFoundError);

    clearGeoCache(); clearPlacesCache();
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("geocoding-api")) return new Response(JSON.stringify(geoOk));
      calls++;
      return u.includes("overpass-api.de") ? new Response("busy", { status: 429 }) : new Response(JSON.stringify({ elements: [] }));
    }));
    const r = await searchPlaces("Hyderabad", "catering");
    expect(calls).toBe(2);
    expect(r.results).toEqual([]);
  });
  it("uses a live forecast inside 16 days and historical climate beyond", async () => {
    vi.stubGlobal("fetch", route({
      "geocoding-api": geoOk,
      "api.open-meteo.com/v1/forecast": { daily: { temperature_2m_max: [31.2], temperature_2m_min: [24], precipitation_probability_max: [70], precipitation_sum: [8] } },
    }));
    const f = await getWeather("Hyderabad", "2026-11-05", "2026-10-27");
    expect(f?.mode).toBe("forecast");
    expect(f?.rainChance).toBe(70);
    expect(f?.advice[0]).toMatch(/rain/i);

    clearWeatherCache();
    vi.stubGlobal("fetch", route({
      "geocoding-api": geoOk,
      "archive-api": { daily: { temperature_2m_max: [36, 38], temperature_2m_min: [25, 26], precipitation_sum: [0, 5] } },
    }));
    const c = await getWeather("Hyderabad", "2027-02-14", "2026-10-27");
    expect(c?.mode).toBe("climate");
    expect(c?.rainChance).toBe(50);
    expect(c?.sampleDays).toBe(10);
  });
  it("returns null for past dates", async () => {
    expect(await getWeather("Hyderabad", "2020-01-01", "2026-10-27")).toBeNull();
  });
});

describe("weather maths", () => {
  it("builds 5 yearly windows around the same date", () => {
    const w = historicalWindows("2027-02-14");
    expect(w).toHaveLength(5);
    expect(w[0]).toEqual({ start: "2026-02-11", end: "2026-02-17" });
  });
  it("summarises climate and handles empty data", () => {
    expect(summarizeClimate([{ temperature_2m_max: [30, 34], temperature_2m_min: [20, 22], precipitation_sum: [0, 10] }])).toMatchObject({ maxC: 32, minC: 21, rainChance: 50, rainMm: 5 });
    expect(summarizeClimate([])).toBeNull();
  });
  it("gives heat, rain and cold advice", () => {
    expect(weatherAdvice({ rainChance: 10, maxC: 40, minC: 28 }).join(" ")).toMatch(/hot/i);
    expect(weatherAdvice({ rainChance: 80, maxC: 28, minC: 22 })[0]).toMatch(/High chance/);
    expect(weatherAdvice({ rainChance: 10, maxC: 20, minC: 8 }).join(" ")).toMatch(/Chilly/);
  });
});

describe("guest CSV export", () => {
  const guests: Guest[] = [
    { id: "1", eventId: "e", name: "=HYPERLINK(\"x\")", invited: ["Mehendi", "Wedding"], token: "t", rsvps: [{ event: "Wedding", status: "yes", partySize: 3 }] },
    { id: "2", eventId: "e", name: "Ravi, Kumar", phone: "919876543210", invited: ["Wedding"], token: "u", rsvps: [] },
  ];
  it("neutralises formula injection and quotes commas", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("a,b")).toBe('"a,b"');
  });
  it("exports per-event status and heads", () => {
    const csv = guestsToCsv(guests, ["Mehendi", "Wedding"]).split("\r\n");
    expect(csv[0]).toBe("Name,Phone,Group,Mehendi RSVP,Mehendi heads,Wedding RSVP,Wedding heads");
    expect(csv[1]).toContain("waiting,,yes,3");
    expect(csv[2]).toContain("not invited");
    expect(csv[2].startsWith('"Ravi, Kumar"')).toBe(true);
  });
  it("lists guests still waiting", () => {
    expect(guestsWaiting(guests).map((g) => g.id)).toEqual(["1", "2"]);
  });
});
