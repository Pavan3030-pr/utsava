import { sb, ensureUser } from "./supabase/client";
import type { Guest, Rsvp } from "./schemas";

interface GuestRow {
  id: string; event_id: string; name: string; phone: string | null; group_name: string | null;
  diet: string | null; invited: string[]; token: string;
  rsvps?: { event_name: string; status: Rsvp["status"]; party_size: number; note: string | null }[];
}

const toGuest = (r: GuestRow): Guest => ({
  id: r.id, eventId: r.event_id, name: r.name, phone: r.phone ?? undefined, group: r.group_name ?? undefined,
  diet: r.diet ?? undefined, invited: r.invited ?? [], token: r.token,
  rsvps: (r.rsvps ?? []).map((x) => ({ event: x.event_name, status: x.status, partySize: x.party_size, note: x.note ?? undefined })),
});

export async function listGuests(eventId: string): Promise<Guest[]> {
  await ensureUser();
  const { data, error } = await sb().from("guests").select("*, rsvps(*)").eq("event_id", eventId).order("created_at");
  if (error) throw new Error(error.message);
  return (data as GuestRow[]).map(toGuest);
}

export async function addGuests(
  eventId: string,
  items: { name: string; phone?: string; group?: string; diet?: string }[],
  invited: string[],
): Promise<void> {
  await ensureUser();
  const rows = items.map((g) => ({ event_id: eventId, name: g.name, phone: g.phone ?? null, group_name: g.group ?? null, diet: g.diet ?? null, invited }));
  const { error } = await sb().from("guests").insert(rows);
  if (error) throw new Error(error.message);
}

export async function setGuestInvites(guestId: string, invited: string[]): Promise<void> {
  const { error } = await sb().from("guests").update({ invited }).eq("id", guestId);
  if (error) throw new Error(error.message);
}

export async function removeGuest(guestId: string): Promise<void> {
  const { error } = await sb().from("guests").delete().eq("id", guestId);
  if (error) throw new Error(error.message);
}
