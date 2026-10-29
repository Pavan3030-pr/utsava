import type { NextRequest } from "next/server";
import { clientIp, jsonError, parseRequest } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { adminClient } from "@/lib/supabase/admin";
import { RsvpSubmitSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Ctx { params: Promise<{ token: string }> }

async function loadGuest(token: string) {
  const admin = adminClient();
  if (!admin) return { error: jsonError("RSVP is not configured on this server.", 503) } as const;
  if (!UUID.test(token)) return { error: jsonError("This invitation link isn’t valid.", 404) } as const;

  const { data: guest } = await admin
    .from("guests")
    .select("id,name,invited,event_id,rsvps(event_name,status,party_size,note)")
    .eq("token", token)
    .maybeSingle();
  if (!guest) return { error: jsonError("This invitation link isn’t valid.", 404) } as const;
  return { admin, guest } as const;
}

/** Personalised invitation: only exposes what this guest needs to see. */
export async function GET(req: NextRequest, ctx: Ctx) {
  // Cheap guard against token-guessing / scraping of invitation pages.
  const rl = await checkRateLimit(`rsvp-get:${clientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return jsonError("Too many requests — please wait a moment and try again.", 429, { "Retry-After": String(rl.retryAfterSec) });
  const { token } = await ctx.params;
  const found = await loadGuest(token);
  if ("error" in found) return found.error;
  const { admin, guest } = found;

  const { data: ev } = await admin.from("events").select("intake,plan,ledger").eq("id", guest.event_id).maybeSingle();
  if (!ev?.plan) return jsonError("This event isn’t ready yet.", 404);

  const plan = ev.plan as { title: string; tagline: string; themes?: { palette?: string[] }[]; schedule?: { day: string; name: string; vibe: string; items: { time: string; activity: string }[] }[] };
  const intake = ev.intake as { date?: string; location?: string };
  const schedule = (plan.schedule ?? []).filter((s) => guest.invited.includes(s.name));
  const rawBy = (ev.ledger as { rsvpBy?: unknown } | null)?.rsvpBy;
  const replyBy = typeof rawBy === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawBy) ? rawBy : null;

  return Response.json(
    {
      guest: { name: guest.name, invited: guest.invited },
      event: {
        title: plan.title, tagline: plan.tagline, date: intake.date ?? null, location: intake.location ?? null, replyBy,
        palette: plan.themes?.[0]?.palette ?? [], schedule,
      },
      responses: (guest.rsvps ?? []).map((r) => ({ event: r.event_name, status: r.status, partySize: r.party_size, note: r.note ?? "" })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const parsed = await parseRequest(req, RsvpSubmitSchema, { bucket: `rsvp:${token.slice(0, 8)}`, limit: 20, maxBytes: 6_000 });
  if (!parsed.ok) return parsed.response;

  const found = await loadGuest(token);
  if ("error" in found) return found.error;
  const { admin, guest } = found;

  const rows = parsed.data.responses
    .filter((r) => guest.invited.includes(r.event)) // can only answer for events they're invited to
    .map((r) => ({
      guest_id: guest.id, event_name: r.event, status: r.status,
      party_size: r.status === "no" ? 1 : r.partySize, note: r.note ?? null, responded_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return jsonError("No valid events to respond to.", 422);

  const { error } = await admin.from("rsvps").upsert(rows, { onConflict: "guest_id,event_name" });
  if (error) {
    console.error("[rsvp]", error);
    return jsonError("Couldn’t save your response. Please try again.", 500);
  }
  return Response.json({ ok: true, saved: rows.length });
}
