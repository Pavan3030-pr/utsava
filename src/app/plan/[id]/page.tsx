"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { SiteHeader } from "@/components/Logo";
import { Checklist } from "@/components/plan/Checklist";
import { GenerationStatus, type PartState } from "@/components/plan/GenerationStatus";
import { Overview } from "@/components/plan/Overview";
import { Skeleton } from "@/components/plan/ui";
import { nextActions, type TabTarget } from "@/lib/actions";
import { daysBetween, todayIso } from "@/lib/dates";
import { buildIcs } from "@/lib/ics";
import { normalizePlan, planToText } from "@/lib/plan-utils";
import { repo, type EventRecord } from "@/lib/repo";
import { createSaveQueue } from "@/lib/save-queue";
import { dedupePlan } from "@/lib/dedupe";
import {
  PLAN_PARTS, PlanCoreSchema, PlanIdeasSchema, PlanOpsSchema, PlanSchema, PlanScheduleSchema,
  type Ledger, type PartialPlan, type PlanPart, type StoredPlan,
} from "@/lib/schemas";

/** Heavy tabs load on demand (and are preloaded once the plan is ready, and before printing). */
const loaders = {
  budget: () => import("@/components/plan/Budget").then((m) => m.Budget),
  spend: () => import("@/components/plan/Spend").then((m) => m.Spend),
  schedule: () => import("@/components/plan/Schedule").then((m) => m.Schedule),
  vendors: () => import("@/components/plan/Vendors").then((m) => m.Vendors),
  guests: () => import("@/components/plan/Guests").then((m) => m.Guests),
  ideas: () => import("@/components/plan/Ideas").then((m) => m.Ideas),
  runsheet: () => import("@/components/plan/RunSheet").then((m) => m.RunSheet),
  copilot: () => import("@/components/plan/Copilot").then((m) => m.Copilot),
};
const TabLoading = () => <div role="status" aria-label="Loading section" className="shimmer h-56" aria-busy="true" />;
const Budget = dynamic(loaders.budget, { loading: TabLoading });
const Spend = dynamic(loaders.spend, { loading: TabLoading });
const Schedule = dynamic(loaders.schedule, { loading: TabLoading });
const Vendors = dynamic(loaders.vendors, { loading: TabLoading });
const Guests = dynamic(loaders.guests, { loading: TabLoading });
const Ideas = dynamic(loaders.ideas, { loading: TabLoading });
const RunSheet = dynamic(loaders.runsheet, { loading: TabLoading });
const Copilot = dynamic(loaders.copilot, { loading: TabLoading });
const preloadTabs = () => Promise.all(Object.values(loaders).map((load) => load()));

const TABS = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "budget", label: "Budget", icon: "₹" },
  { id: "spend", label: "Spend tracker", icon: "▤", needsPlan: true },
  { id: "schedule", label: "Schedule", icon: "◷" },
  { id: "checklist", label: "Checklist", icon: "☑" },
  { id: "vendors", label: "Vendors", icon: "✦" },
  { id: "guests", label: "Guests & RSVP", icon: "☺", needsPlan: true },
  { id: "runsheet", label: "Run sheet", icon: "⚑", needsPlan: true },
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
  const [copilotSeen, setCopilotSeen] = useState(false);
  useEffect(() => { if (tab === "copilot") setCopilotSeen(true); }, [tab]);
  // Warm the other tabs in the background once the plan exists, so switching feels instant.
  const hasPlan = Boolean(record?.plan);
  useEffect(() => {
    if (!hasPlan) return;
    const t = window.setTimeout(() => { void preloadTabs(); }, 1200);
    return () => window.clearTimeout(t);
  }, [hasPlan]);
  const [printing, setPrinting] = useState(false);
  const [toast, setToast] = useState("");
  const [genError, setGenError] = useState("");
  const [loadError, setLoadError] = useState("");
  const recordRef = useRef<EventRecord | null>(null);
  const startedRef = useRef(false);
  const partsRef = useRef<Partial<Record<PlanPart, unknown>>>({});
  const [doneParts, setDoneParts] = useState<PlanPart[]>([]);
  const startRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const attemptsRef = useRef<Partial<Record<PlanPart, number>>>({});
  const retryPartRef = useRef<(part: PlanPart) => void>(() => {});
  const [healing, setHealing] = useState(0);

  const flash = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2800); }, []);

  const saveQueue = useRef(
    createSaveQueue<EventRecord>(
      (rec) => repo.save(rec),
      (e) => flash(e instanceof Error ? e.message : "Couldn’t save changes — retrying on your next edit"),
    ),
  );
  const persist = useCallback((next: EventRecord, opts?: { immediate?: boolean }) => {
    recordRef.current = next;
    setRecord(next);
    saveQueue.current.push(next, opts);
  }, []);

  // Never lose an edit: flush pending writes when the tab is hidden, closed or navigated away from.
  useEffect(() => {
    const q = saveQueue.current;
    const onHide = () => { if (document.visibilityState === "hidden") void q.flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", onHide); void q.flush(); };
  }, []);

  /** A slice failed (HTTP error or malformed JSON). Heal silently on a fallback model before showing anything. */
  const failPart = useCallback((part: PlanPart, err?: Error) => {
    const msg = friendly(err?.message);
    const fatal = /too many requests|not configured|cross-origin|too large/i.test(msg);
    const tried = attemptsRef.current[part] ?? 0;
    if (!fatal && tried < 2 && recordRef.current) {
      attemptsRef.current[part] = tried + 1;
      setHealing((n) => n + 1);
      setTimeout(() => retryPartRef.current(part), 350 * (tried + 1));
      return;
    }
    setGenError(msg || "Part of the AI response was incomplete. Please try again.");
  }, []);

  /** When all four slices have arrived, validate the whole plan, verify the maths, save. */
  const finishPart = useCallback((part: PlanPart, obj: unknown, err?: Error) => {
    if (!obj) { failPart(part, err); return; }
    partsRef.current[part] = obj;
    setDoneParts((d) => (d.includes(part) ? d : [...d, part]));
    const p = partsRef.current;
    if (!PLAN_PARTS.every((k) => p[k])) return;
    const rec = recordRef.current;
    if (!rec) return;
    const merged = PLAN_PARTS.reduce((acc, k) => ({ ...acc, ...(p[k] as object) }), {});
    const full = PlanSchema.safeParse(merged);
    if (!full.success) { setGenError("The AI returned an unexpected format. Please try again."); return; }
    setGenError("");
    setHealing(0);
    const seconds = startRef.current ? (performance.now() - startRef.current) / 1000 : 0;
    setElapsed(seconds * 1000);
    startRef.current = null;
    persist({ ...rec, plan: normalizePlan(full.data, rec.intake) }, { immediate: true });
    if (seconds > 0) flash(`Plan ready in ${seconds.toFixed(1)}s ✦`);
  }, [persist, flash, failPart]);

  const core = useObject({ api: "/api/plan/stream?part=core", schema: PlanCoreSchema, onFinish: ({ object, error }) => finishPart("core", object, error), onError: (error) => failPart("core", error) });
  const schedule = useObject({ api: "/api/plan/stream?part=schedule", schema: PlanScheduleSchema, onFinish: ({ object, error }) => finishPart("schedule", object, error), onError: (error) => failPart("schedule", error) });
  const ops = useObject({ api: "/api/plan/stream?part=ops", schema: PlanOpsSchema, onFinish: ({ object, error }) => finishPart("ops", object, error), onError: (error) => failPart("ops", error) });
  const ideas = useObject({ api: "/api/plan/stream?part=ideas", schema: PlanIdeasSchema, onFinish: ({ object, error }) => finishPart("ideas", object, error), onError: (error) => failPart("ideas", error) });
  const submitters = useRef({ core: core.submit, schedule: schedule.submit, ops: ops.submit, ideas: ideas.submit });
  submitters.current = { core: core.submit, schedule: schedule.submit, ops: ops.submit, ideas: ideas.submit };

  const runParts = useCallback((rec: EventRecord, only: readonly PlanPart[] = PLAN_PARTS) => {
    if (startRef.current === null) startRef.current = performance.now();
    for (const p of only) submitters.current[p]({ ...rec.intake, attempt: attemptsRef.current[p] ?? 0 });
  }, []);
  retryPartRef.current = (part) => { const rec = recordRef.current; if (rec && !partsRef.current[part]) runParts(rec, [part]); };

  useEffect(() => {
    let alive = true;
    repo.get(id)
      .then((found) => {
        if (!alive) return;
        recordRef.current = found;
        setRecord(found);
        if (found) document.title = `${found.intake.title} — Utsava`;
        // Plans saved before duplicate protection existed: clean them once, keeping ticks and budget intact.
        if (found?.plan) {
          const { removed } = dedupePlan(found.plan);
          if (removed > 0) {
            persist({ ...found, plan: normalizePlan(found.plan, { ...found.intake, budget: undefined }, new Date(found.plan.meta?.generatedAt ?? Date.now()), true) }, { immediate: true });
            flash(`Merged ${removed} repeated ${removed === 1 ? "entry" : "entries"} in your plan`);
          }
        }
      })
      .catch((e) => { if (alive) { setLoadError(e instanceof Error ? e.message : "Couldn’t load this plan"); setRecord(null); } });
    return () => { alive = false; };
  }, [id, persist, flash]);

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
    const missing = PLAN_PARTS.filter((p) => !partsRef.current[p]);
    for (const p of missing) attemptsRef.current[p] = 1; // go straight to the fallback model
    runParts(rec, missing);
  };

  const generating = !record?.plan && startRef.current !== null;
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => { if (startRef.current !== null) setElapsed(performance.now() - startRef.current); }, 100);
    return () => clearInterval(t);
  }, [generating]);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const t = window.setTimeout(() => window.print(), 250); // let the just-mounted sections paint
    return () => { window.removeEventListener("afterprint", done); window.clearTimeout(t); };
  }, [printing]);

  // Hooks must run on every render, so these live above the early returns below.
  const streamedNow = useMemo(
    () => ({ ...core.object, ...schedule.object, ...ops.object, ...ideas.object }) as unknown as PartialPlan,
    [core.object, schedule.object, ops.object, ideas.object],
  );
  const streamed = useDeferredValue(streamedNow);

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
  const plan = (stored ?? streamed) as PartialPlan;
  const isLoading = core.isLoading || schedule.isLoading || ops.isLoading || ideas.isLoading;
  const streaming = !stored && (isLoading || !genError);
  const errorText = !stored ? genError : "";
  const loadingBy: Record<PlanPart, boolean> = { core: core.isLoading, schedule: schedule.isLoading, ops: ops.isLoading, ideas: ideas.isLoading };
  const objBy: Record<PlanPart, unknown> = { core: core.object, schedule: schedule.object, ops: ops.object, ideas: ideas.object };
  const partStates = Object.fromEntries(PLAN_PARTS.map((p) => [p, doneParts.includes(p) ? "done" : loadingBy[p] || objBy[p] ? "writing" : "waiting"])) as Record<PlanPart, PartState>;
  const days = intake.date ? daysBetween(todayIso(), intake.date) : undefined;

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

  const actions = stored ? nextActions({ plan: stored, intake, ledger: record.ledger, today: todayIso() }) : [];
  const go = (t: TabTarget) => setTab(t as TabId);
  const show = (t: TabId) => printing || tab === t;
  const panel = (t: TabId, node: React.ReactNode) => show(t) && <div role="tabpanel" id={`panel-${t}`} aria-labelledby={`tab-${t}`} className={t === "overview" ? "" : "print-section"}><h2 className="sr-only">{TABS.find((x) => x.id === t)?.label}</h2>{node}</div>;

  return (
    <div className="ambient min-h-screen">
      <SiteHeader />
      <main id="main" className="container-x py-8 sm:py-10">
        <header className="print-only mb-4 flex items-baseline justify-between border-b border-line pb-2 text-xs text-soft">
          <span className="font-semibold tracking-wide">उत्सव · Utsava event plan</span>
          <span>Generated {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
        </header>
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
            <button type="button" className="btn btn-ghost btn-sm" disabled={!stored} onClick={() => { void preloadTabs().finally(() => setPrinting(true)); }}>Save as PDF / Print</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!stored || !intake.date} onClick={downloadIcs}>Add to calendar (.ics)</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!stored} onClick={share}>Share plan</button>
          </div>
        </section>

        {streaming && <GenerationStatus states={partStates} elapsedMs={elapsed} healing={healing} />}

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
            {panel("overview", <Overview plan={plan} intake={intake} streaming={streaming} actions={actions} onNavigate={go} />)}
            {panel("budget", <Budget plan={plan} guests={intake.guests} streaming={streaming} />)}
            {stored && panel("spend", <Spend plan={stored} ledger={record.ledger} onChange={setLedger} />)}
            {panel("schedule", <Schedule plan={plan} eventDate={intake.date} streaming={streaming} />)}
            {panel("checklist", <Checklist plan={plan} streaming={streaming} onToggle={toggle} />)}
            {panel("vendors", <Vendors plan={plan} streaming={streaming} ledger={record.ledger} city={intake.location} onLedger={setLedger} />)}
            {stored && !printing && tab === "guests" && panel("guests", <Guests eventId={record.id} plan={stored} plannedGuests={intake.guests} ledger={record.ledger} onLedger={setLedger} />)}
            {stored && panel("runsheet", <RunSheet plan={stored} intake={intake} ledger={record.ledger} />)}
            {panel("ideas", <Ideas plan={plan} streaming={streaming} />)}
            {/* Stays mounted once opened (just hidden) so the conversation and Undo history survive switching tabs. */}
            {stored && !printing && (tab === "copilot" || copilotSeen) && (
              <div role="tabpanel" id="panel-copilot" aria-labelledby="tab-copilot" hidden={tab !== "copilot"} className="print-section">
                <div className="mx-auto max-w-2xl"><Copilot intake={intake} plan={stored} onApply={(p) => { const rec = recordRef.current; if (rec) persist({ ...rec, plan: p }, { immediate: true }); }} /></div>
              </div>
            )}
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
