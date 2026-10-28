"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addGuests, listGuests, removeGuest, setGuestInvites } from "@/lib/guests-db";
import { findDuplicateGuests, planGuestImport } from "@/lib/dedupe";
import { eventNames, guestsToCsv, guestsWaiting, inviteMessage, parseBulkGuests, rsvpLink, summarizeRsvps, whatsappUrl } from "@/lib/guests";
import type { Guest, StoredPlan } from "@/lib/schemas";
import { CLOUD_ENABLED } from "@/lib/supabase/client";
import { Panel } from "./ui";

const GROUPS = ["Bride’s family", "Groom’s family", "Friends", "Colleagues", "Neighbours", "Family"];
const STATUS_STYLE = { yes: "bg-leaf-soft text-leaf", no: "bg-rose-soft text-kumkum-dark", maybe: "bg-gold-soft text-saffron-dark", pending: "bg-[#f3ece2] text-soft" } as const;

export function Guests({ eventId, plan, plannedGuests }: { eventId: string; plan: StoredPlan; plannedGuests?: number }) {
  const events = useMemo(() => eventNames(plan.schedule), [plan.schedule]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(CLOUD_ENABLED);
  const [error, setError] = useState("");
  const [bulk, setBulk] = useState("");
  const [group, setGroup] = useState(GROUPS[0]);
  const [selected, setSelected] = useState<string[]>(events);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try { setGuests(await listGuests(eventId)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn’t load guests"); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { if (CLOUD_ENABLED) void refresh(); }, [refresh]);
  useEffect(() => setSelected(events), [events]);

  if (!CLOUD_ENABLED) {
    return (
      <Panel kicker="Guests & RSVPs" title="Connect Supabase to unlock guest management">
        <p className="text-sm text-soft">Guest lists, per-event invitations and live RSVPs need a database so your guests can respond from their own phones. Add the three Supabase keys from <code>.env.example</code>, run <code>supabase/schema.sql</code>, and this tab comes alive.</p>
      </Panel>
    );
  }

  const stats = summarizeRsvps(guests, events);
  const confirmed = Math.max(...events.map((e) => stats[e]?.headcount ?? 0), 0);

  const add = async () => {
    const items = parseBulkGuests(bulk).map((g) => ({ ...g, group: g.group ?? group }));
    if (items.length === 0 || selected.length === 0) return;
    setBusy(true);
    setNotice("");
    try {
      // Never create the same person twice: skip repeats, and widen invites for people already listed.
      const plan = planGuestImport(guests, items, selected);
      if (plan.toInsert.length) await addGuests(eventId, plan.toInsert, selected);
      for (const u of plan.toUpdate) await setGuestInvites(u.id, u.invited);
      setBulk("");
      setNotice(`Added ${plan.toInsert.length}${plan.toUpdate.length ? ` · updated invites for ${plan.toUpdate.length}` : ""}${plan.skipped ? ` · skipped ${plan.skipped} already on the list` : ""}.`);
      await refresh();
    }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn’t add guests"); }
    finally { setBusy(false); }
  };

  const dupes = findDuplicateGuests(guests);
  const cleanDuplicates = async () => {
    const extra = dupes.reduce((n, d) => n + d.remove.length, 0);
    if (!window.confirm(`Merge ${extra} repeated guest${extra === 1 ? "" : "s"}? The entry that already has RSVPs is kept and invitations are combined.`)) return;
    setBusy(true);
    try {
      for (const d of dupes) {
        if (d.invited.length !== d.keep.invited.length) await setGuestInvites(d.keep.id, d.invited);
        for (const r of d.remove) await removeGuest(r.id);
      }
      setNotice(`Merged ${extra} repeated guest${extra === 1 ? "" : "s"}.`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t merge duplicates"); }
    finally { setBusy(false); }
  };

  const link = (g: Guest) => rsvpLink(window.location.origin, g.token);
  const copy = async (g: Guest) => {
    try { await navigator.clipboard.writeText(link(g)); setCopied(g.id); setTimeout(() => setCopied(""), 1800); } catch { /* clipboard blocked */ }
  };
  const waiting = guestsWaiting(guests);
  const visible = onlyWaiting ? waiting : guests;
  const exportCsv = () => {
    const blob = new Blob(["\uFEFF" + guestsToCsv(guests, events)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "utsava-guest-list.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const statusOf = (g: Guest, e: string) => g.rsvps.find((r) => r.event === e);

  return (
    <div className="space-y-6">
      {/* per-event stats — the multi-event matrix big apps don't have */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => {
          const s = stats[e];
          return (
            <section key={e} className="surface p-5" aria-label={`${e} RSVP summary`}>
              <h3 className="font-semibold">{e}</h3>
              <p className="h-display mt-1 text-3xl font-semibold grad-text">{s.headcount}<span className="ml-1 text-sm font-medium text-soft">confirmed heads</span></p>
              <dl className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
                {([["Invited", s.invited], ["Yes", s.yes], ["Maybe", s.maybe], ["Waiting", s.pending]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-cream/70 py-1.5"><dt className="text-soft">{k}</dt><dd className="font-bold tabular-nums">{v}</dd></div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
      {plannedGuests && confirmed > plannedGuests && (
        <p role="alert" className="rounded-2xl bg-rose-soft p-4 text-sm text-kumkum-dark">⚠ Confirmed headcount ({confirmed}) is above the {plannedGuests} guests you planned for — revisit catering and venue capacity.</p>
      )}

      <Panel kicker="Add guests" title="Paste your list">
        <label htmlFor="bulk" className="field-label">One guest per line: <code>Name, phone, group</code> (phone &amp; group optional)</label>
        <textarea id="bulk" rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"Anita Reddy, 9876543210, Bride’s family\nRavi Kumar, 9123456780\nPriya"} className="input resize-y" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="grp" className="field-label">Default group</label>
            <input id="grp" list="groups" value={group} onChange={(e) => setGroup(e.target.value)} className="input" />
            <datalist id="groups">{GROUPS.map((g) => <option key={g} value={g} />)}</datalist>
          </div>
          <fieldset>
            <legend className="field-label">Invite them to</legend>
            <div className="flex flex-wrap gap-2">
              {events.map((e) => (
                <label key={e} className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs has-[:checked]:border-kumkum has-[:checked]:bg-rose-soft">
                  <input type="checkbox" className="accent-[#b4234e]" checked={selected.includes(e)} onChange={() => setSelected((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]))} />
                  {e}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <button type="button" onClick={add} disabled={busy || !bulk.trim() || selected.length === 0} className="btn btn-primary mt-5">{busy ? "Adding…" : "Add to guest list"}</button>
      </Panel>

      {error && <p role="alert" className="rounded-2xl bg-rose-soft p-4 text-sm text-kumkum-dark">{error}</p>}

      <Panel kicker={`${guests.length} guests`} title="Guest list & invitations">
        {guests.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>Export CSV</button>
            {dupes.length > 0 && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={cleanDuplicates}>Merge {dupes.reduce((n, d) => n + d.remove.length, 0)} repeated guest{dupes.reduce((n, d) => n + d.remove.length, 0) === 1 ? "" : "s"}</button>}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[#b4234e]" checked={onlyWaiting} onChange={(e) => setOnlyWaiting(e.target.checked)} />
              Only guests who haven’t replied ({waiting.length})
            </label>
          </div>
        )}
        {notice && <p role="status" className="mb-3 text-sm text-leaf">{notice}</p>}
        {loading ? <div className="shimmer h-24" aria-busy="true" /> : guests.length === 0 ? (
          <p className="text-sm text-soft">No guests yet. Paste a list above — each guest gets their own personal RSVP link.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{g.name} {g.group && <span className="ml-1 text-xs font-medium text-soft">· {g.group}</span>}</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={`${g.name}'s responses`}>
                    {g.invited.map((e) => {
                      const r = statusOf(g, e);
                      const k = (r?.status ?? "pending") as keyof typeof STATUS_STYLE;
                      return <li key={e} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[k]}`}>{e}: {r ? (r.status === "yes" ? `yes (${r.partySize})` : r.status) : "waiting"}</li>;
                    })}
                  </ul>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a className="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer"
                    href={whatsappUrl(g.phone, inviteMessage({ guestName: g.name, eventTitle: plan.title, link: link(g) }))}>
                    WhatsApp<span className="sr-only"> invite to {g.name} (opens in a new tab)</span>
                  </a>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(g)}>{copied === g.id ? "Copied ✓" : "Copy link"}</button>
                  <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${g.name}`} onClick={async () => { await removeGuest(g.id); await refresh(); }}>✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
