"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { SiteHeader } from "@/components/Logo";
import { Budget } from "@/components/plan/Budget";
import { Checklist } from "@/components/plan/Checklist";
import { Copilot } from "@/components/plan/Copilot";
import { Guests } from "@/components/plan/Guests";
import { Ideas } from "@/components/plan/Ideas";
import { Overview } from "@/components/plan/Overview";
import { Schedule } from "@/components/plan/Schedule";
import { Spend } from "@/components/plan/Spend";
import { Skeleton, list } from "@/components/plan/ui";
import { Vendors } from "@/components/plan/Vendors";
import { daysBetween, todayIso } from "@/lib/dates";
import { buildIcs } from "@/lib/ics";
import { normalizePlan, planToText } from "@/lib/plan-utils";
import { repo, type EventRecord } from "@/lib/repo";
import {
  PLAN_PARTS, PlanCoreSchema, PlanOpsSchema, PlanSchema, PlanScheduleSchema,
  type Ledger, type PartialPlan, type PlanPart, type StoredPlan,
} from "@/lib/schemas";

const TABS = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "budget", label: "Budget", icon: "₹" },
  { id: "spend", label: "Spend tracker", icon: "▤", needsPlan: true },
  { id: "schedule", label: "Schedule", icon: "◷" },
  { id: "checklist", label: "Checklist", icon: "☑" },
  { id: "vendors", label: "Vendors", icon: "✦" },
  { id: "guests", label: "Guests & RSVP", icon: "☺", needsPlan: true },
  { id: "ideas", label: "Ideas & invite", icon: "❀" },
  { id: "copilot", label: "AI Copilot", icon: "✧", needsPlan: true },
] as const;
type TabId = (typeof TABS)[number]["id"];

function friendly(message: string | undefined): string {
  if (!message) return "";
  try { const p = JSON.parse(message); if (p?.error) return String(p.error); } catch { /* not JSON */ }
  return message;
}

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<EventRecord | null | undefined>(undefined);
  const [tab, setTab] = useState<TabId>("overview");
  const [printing, setPrinting] = useState(false);
  const [toast, setToast] = useState("");
  const [genError, setGenError] = useState("");
  const [loadError, setLoadError] = useState("");
  const recordRef = useRef<EventRecord | null>(null);
  const startedRef = useRef(false);
  const partsRef = useRef<Partial<Record<PlanPart, unknown>>>({});

  const flash = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2800); }, []);

  const persist = useCallback((next: EventRecord) => {
    recordRef.current = next;
    setRecord(next);
    repo.save(next).catch((e) => flash(e instanceof Error ? e.message : "Couldn’t save changes"));
  }, [flash]);

  /** When all three slices have arrived, validate the whole plan, verify the maths, save. */
  const finishPart = useCallback((part: PlanPart, obj: unknown, err?: Error) => {
    if (!obj) { setGenError(friendly(err?.message) || "Part of the AI response was incomplete. Please try again."); return; }
    partsRef.current[part] = obj;
    const p = partsRef.current;
    if (!p.core || !p.schedule || !p.ops) return;
    const rec = recordRef.current;
    if (!rec) return;
    const full = PlanSchema.safeParse({ ...(p.core as object), ...(p.schedule as object), ...(p.ops as object) });
    if (!full.success) { setGenError("The AI returned an unexpected format. Please try again."); return; }
    setGenError("");
    persist({ ...rec, plan: normalizePlan(full.data, rec.intake) });
  }, [persist]);

  const core = useObject({ api: "/api/plan/stream?part=core", schema: PlanCoreSchema, onFinish: ({ object, error }) => finishPart("core", object, error) });
  const schedule = useObject({ api: "/api/plan/stream?part=schedule", schema: PlanScheduleSchema, onFinish: ({ object, error }) => finishPart("schedule", object, error) });
  const ops = useObject({ api: "/api/plan/stream?part=ops", schema: PlanOpsSchema, onFinish: ({ object, error }) => finishPart("ops", object, error) });
  const submitters = useRef({ core: core.submit, schedule: schedule.submit, ops: ops.submit });
  submitters.current = { core: core.submit, schedule: schedule.submit, ops: ops.submit };

  const runParts = useCallback((rec: EventRecord, only: readonly PlanPart[] = PLAN_PARTS) => {
    for (const p of only) submitters.current[p](rec.intake);
  }, []);

  useEffect(() => {
    let alive = true;
    repo.get(id)
      .then((found) => {
        if (!alive) return;
        recordRef.current = found;
        setRecord(found);
        if (found) document.title = `${found.intake.title} — Utsava`;
      })
      .catch((e) => { if (alive) { setLoadError(e instanceof Error ? e.message : "Couldn’t load this plan"); setRecord(null); } });
    return () => { alive = false; };
  }, [id]);

  // Fire all three slices in parallel the first time we see an event without a plan
  useEffect(() => {
    if (!record || record.plan || startedRef.current) return;
    startedRef.current = true;
    runParts(record);
  }, [record, runParts]);

  const retry = () => {
    const rec = recordRef.current;
    if (!rec) return;
    setGenError("");
    runParts(rec, PLAN_PARTS.filter((p) => !partsRef.current[p]));
  };

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const t = requestAnimationFrame(() => window.print());
    return () => { window.removeEventListener("afterprint", done); cancelAnimationFrame(t); };
  }, [printing]);

  if (record === undefined) {
    return <div className="ambient min-h-screen"><SiteHeader /><main id="main" className="mx-auto max-w-6xl px-5 py-12"><div className="shimmer h-64" aria-busy="true" /></main></div>;
  }
  if (record === null) {
    return (
      <div className="ambient min-h-screen"><SiteHeader />
        <main id="main" className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="h-display text-3xl font-semibold">We couldn’t find that plan</h1>
          <p className="mt-3 text-soft">{loadError || "It may have been deleted, or opened in a different browser."}</p>
          <Link href="/create" className="btn btn-primary mt-8">Plan a new event</Link>
        </main>
      </div>
    );
  }

  const { intake } = record;
  const stored: StoredPlan | null = record.plan;
  const streamed = { ...core.object, ...schedule.object, ...ops.object } as unknown as PartialPlan;
  const plan = (stored ?? streamed) as PartialPlan;
  const isLoading = core.isLoading || schedule.isLoading || ops.isLoading;
  const streaming = !stored && (isLoading || (!genError && !core.error && !schedule.error && !ops.error));
  const errorText = !stored ? genError || friendly((core.error ?? schedule.error ?? ops.error)?.message) : "";
  const days = intake.date ? daysBetween(todayIso(), intake.date) : undefined;

  const sections = [
    list(plan.themes).length, plan.budget?.breakdown?.length, list(plan.schedule).length, list(plan.timeline).length,
    list(plan.checklist).length, list(plan.vendors).length, list(plan.culturalNotes).length, list(plan.risks).length, plan.invitation?.message ? 1 : 0,
  ].filter(Boolean).length;

  const setLedger = (ledger: Ledger) => { const rec = recordRef.current; if (rec) persist({ ...rec, ledger }); };

  const toggle = (ci: number, ii: number) => {
    const rec = recordRef.current;
    if (!rec?.plan) return;
    const next = structuredClone(rec.plan);
    const item = next.checklist[ci]?.items[ii];
    if (!item) return;
    item.completed = !item.completed;
    persist({ ...rec, plan: next });
  };

  const downloadIcs = () => {
    if (!stored || !intake.date) return;
    const ics = buildIcs({ uidSeed: record.id, title: stored.title, eventDate: intake.date, timeline: stored.timeline });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `utsava-timeline.ics`; a.click();
    URL.revokeObjectURL(url);
    flash("Calendar file downloaded");
  };

  const share = async () => {
    if (!stored) return;
    const text = planToText(stored, intake);
    try {
      if (navigator.share) await navigator.share({ title: stored.title, text });
      else { await navigator.clipboard.writeText(text); flash("Plan copied to clipboard"); }
    } catch { /* cancelled */ }
  };

  const visibleTabs = TABS.filter((t) => !("needsPlan" in t) || stored);
  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const n = e.key === "Home" ? 0 : e.key === "End" ? visibleTabs.length - 1 : (index + dir + visibleTabs.length) % visibleTabs.length;
    const next = visibleTabs[n];
    setTab(next.id);
    requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus());
  };

  const show = (t: TabId) => printing || tab === t;
  const panel = (t: TabId, node: React.ReactNode) => show(t) && <div role="tabpanel" id={`panel-${t}`} aria-labelledby={`tab-${t}`} className={t === "overview" ? "" : "print-section"}>{node}</div>;

  return (
    <div className="ambient min-h-screen">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-7xl px-5 py-8">
        {/* Hero */}
        <section className="surface relative overflow-hidden p-7 sm:p-9" aria-labelledby="plan-title">
          <div className="rangoli pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-60" aria-hidden="true" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 max-w-3xl flex-1">
              <p className="chip">{intake.type}</p>
              <h1 id="plan-title" className="h-display mt-3 text-4xl font-semibold sm:text-5xl">{plan.title ?? intake.title}</h1>
              {plan.tagline ? <p className="h-display mt-2 text-lg italic text-kumkum">{plan.tagline}</p> : streaming ? <div className="mt-3 max-w-sm"><Skeleton lines={1} /></div> : null}
              <div className="mt-4 text-soft">{plan.summary ?? (streaming ? <Skeleton lines={2} /> : null)}</div>
            </div>
            {days !== undefined && days >= 0 && (
              <div className="rounded-3xl bg-gradient-to-br from-gold-soft to-rose-soft px-8 py-5 text-center" aria-label={`${days} days to go`}>
                <p className="h-display text-5xl font-semibold grad-text tabular-nums">{days}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-soft">days to go</p>
              </div>
            )}
          </div>
          <div className="no-print relative mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-ghost btn-sm" disabled={!stored} onClick={() => setPrinting(true)}>Save as PDF / Print</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!stored || !intake.date} onClick={downloadIcs}>Add to calendar (.ics)</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!stored} onClick={share}>Share plan</button>
          </div>
        </section>

        {streaming && (
          <div role="status" aria-live="polite" className="no-print surface mt-5 flex items-center gap-4 p-4">
            <span aria-hidden="true" className="spin-slow inline-block text-2xl text-saffron">✦</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Three AI planners are writing your plan in parallel…</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f6ead7]">
                <div className="h-full rounded-full bg-gradient-to-r from-saffron to-kumkum transition-all duration-500" style={{ width: `${(sections / 9) * 100}%` }} />
              </div>
            </div>
            <span className="text-sm tabular-nums text-soft">{sections}/9</span>
          </div>
        )}

        {errorText && !isLoading && (
          <div role="alert" className="no-print mt-5 rounded-2xl border border-kumkum/30 bg-rose-soft p-5 text-kumkum-dark">
            <p className="font-semibold">We couldn’t finish your plan</p>
            <p className="mt-1 text-sm">{errorText}</p>
            <button type="button" onClick={retry} className="btn btn-primary btn-sm mt-3">Retry the missing parts</button>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          {/* Sidebar / tabs */}
          <nav aria-label="Plan sections" className="no-print overflow-x-auto lg:sticky lg:top-24 lg:self-start lg:overflow-visible">
            <div role="tablist" className="flex min-w-max gap-1 rounded-3xl border border-line bg-white p-1.5 lg:min-w-0 lg:flex-col">
              {visibleTabs.map((t, i) => (
                <button key={t.id} id={`tab-${t.id}`} role="tab" type="button" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
                  tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)} onKeyDown={(e) => onTabKey(e, i)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold transition ${tab === t.id ? "bg-gradient-to-r from-[#c2410c] to-kumkum text-white shadow" : "text-soft hover:bg-cream"}`}>
                  <span aria-hidden="true" className="w-4 text-center">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="min-w-0">
            {panel("overview", <Overview plan={plan} intake={intake} streaming={streaming} />)}
            {panel("budget", <Budget plan={plan} guests={intake.guests} streaming={streaming} />)}
            {stored && panel("spend", <Spend plan={stored} ledger={record.ledger} onChange={setLedger} />)}
            {panel("schedule", <Schedule plan={plan} eventDate={intake.date} streaming={streaming} />)}
            {panel("checklist", <Checklist plan={plan} streaming={streaming} onToggle={toggle} />)}
            {panel("vendors", <Vendors plan={plan} streaming={streaming} ledger={record.ledger} city={intake.location} onLedger={setLedger} />)}
            {stored && !printing && tab === "guests" && panel("guests", <Guests eventId={record.id} plan={stored} plannedGuests={intake.guests} />)}
            {panel("ideas", <Ideas plan={plan} streaming={streaming} />)}
            {stored && !printing && tab === "copilot" && panel("copilot", (
              <div className="mx-auto max-w-2xl"><Copilot intake={intake} plan={stored} onApply={(p) => { const rec = recordRef.current; if (rec) persist({ ...rec, plan: p }); }} /></div>
            ))}
          </div>
        </div>

        <p className="no-print mt-10 text-center text-xs text-soft">
          AI-generated suggestions — confirm prices and availability with vendors. {repo.mode === "cloud" ? "Your plan is saved securely to your private account." : "Saved privately in this browser (add Supabase keys to sync across devices)."}
        </p>
      </main>

      <div role="status" aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
        {toast && <span className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-xl">{toast}</span>}
      </div>
    </div>
  );
}
