import type { NextRequest } from "next/server";
import { z } from "zod";
import { guardGet, jsonError } from "@/lib/api";
import { log } from "@/lib/log";
import { getWeather } from "@/lib/weather";

export const runtime = "nodejs";
export const maxDuration = 30;

const Query = z.object({
  city: z.string().trim().min(2).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Real weather for the event date: a live forecast within 16 days, otherwise 5-year historical climate. */
export async function GET(req: NextRequest) {
  const blocked = await guardGet(req, "weather", 30);
  if (blocked) return blocked;

  const q = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return jsonError("Provide a city and a date (YYYY-MM-DD).", 422);

  try {
    const w = await getWeather(q.data.city, q.data.date);
    if (!w) return jsonError("No weather data for that place and date.", 404);
    return Response.json(w, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=43200" } });
  } catch (err) {
    log("error", "weather_failed", { error: err instanceof Error ? err.message : String(err) });
    return jsonError("Weather service is unavailable right now.", 502);
  }
}
