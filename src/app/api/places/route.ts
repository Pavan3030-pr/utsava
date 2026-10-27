import type { NextRequest } from "next/server";
import { z } from "zod";
import { guardGet, jsonError } from "@/lib/api";
import { log } from "@/lib/log";
import { categoryKey } from "@/lib/place-categories";
import { CityNotFoundError, searchPlaces } from "@/lib/places";

export const runtime = "nodejs";
export const maxDuration = 30;

const Query = z.object({
  city: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(80),
});

/** Real vendors & venues near the event city, from OpenStreetMap. Read-only, cached, rate-limited. */
export async function GET(req: NextRequest) {
  const blocked = await guardGet(req, "places", 20);
  if (blocked) return blocked;

  const q = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return jsonError("Provide a city and a vendor category.", 422);
  const key = categoryKey(q.data.category);
  if (!key) return jsonError("Live search isn’t available for this category — use the Google Maps link instead.", 422);

  try {
    const data = await searchPlaces(q.data.city, key);
    return Response.json(data, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (err) {
    if (err instanceof CityNotFoundError) return jsonError(err.message, 404);
    log("error", "places_failed", { error: err instanceof Error ? err.message : String(err) });
    return jsonError("Live vendor search is busy right now. Please try again in a moment.", 502);
  }
}
