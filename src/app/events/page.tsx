"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/Logo";
import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { checklistProgress } from "@/lib/plan-utils";
import { repo, type EventRecord } from "@/lib/repo";
import { EVENT_TYPE_META } from "@/lib/schemas";

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    repo.list().then(setEvents).catch((e) => { setError(e instanceof Error ? e.message : "Couldn’t load events"); setEvents([]); });
  }, []);

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete “${title}”? This can’t be undone.`)) return;
    try { await repo.remove(id); setEvents(await repo.list()); } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t delete"); }
  };

  return (
    <div className="ambient min-h-screen">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="h-display text-4xl font-semibold">My events</h1>
        <p className="mt-2 text-soft">{repo.mode === "cloud" ? "Saved securely to your private account." : "Saved privately in this browser."}</p>
        {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-soft p-4 text-sm text-kumkum-dark">{error}</p>}

        {events === null ? <div className="shimmer mt-8 h-32" aria-busy="true" /> : events.length === 0 ? (
          <div className="surface mt-8 p-10 text-center">
            <p className="text-lg font-semibold">No events yet</p>
            <p className="mt-1 text-soft">Describe your first celebration and watch the plan appear.</p>
            <Link href="/create" className="btn btn-primary mt-6">Plan an event</Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {events.map((e) => {
              const pr = checklistProgress(e.plan ?? undefined);
              return (
                <li key={e.id} className="surface surface-hover flex items-center gap-4 p-5">
                  <span aria-hidden="true" className="text-3xl">{EVENT_TYPE_META[e.intake.type].emoji}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/plan/${e.id}`} className="block truncate font-semibold hover:text-kumkum">{e.plan?.title ?? e.intake.title}</Link>
                    <p className="text-sm text-soft">{e.intake.date ? formatDate(e.intake.date) : "Date flexible"}{e.plan ? ` · ${formatINR(e.plan.budget.total)} · ${pr.percent}% done` : " · plan not finished"}</p>
                  </div>
                  <button type="button" onClick={() => remove(e.id, e.intake.title)} className="btn btn-ghost btn-sm" aria-label={`Delete ${e.intake.title}`}>Delete</button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
