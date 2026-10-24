"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { SiteHeader } from "@/components/Logo";
import { Budget } from "@/components/plan/Budget";
import { Checklist } from "@/components/plan/Checklist";
import { Copilot } from "@/components/plan/Copilot";
import { Ideas } from "@/components/plan/Ideas";
import { Overview } from "@/components/plan/Overview";
import { Schedule } from "@/components/plan/Schedule";
import { Skeleton, list } from "@/components/plan/ui";
import { Vendors } from "@/components/plan/Vendors";
import { buildIcs } from "@/lib/ics";
import { normalizePlan, planToText } from "@/lib/plan-utils";
import { PlanSchema, type PartialPlan, type StoredPlan } from "@/lib/schemas";
import { getEvent, saveEvent, type StoredEvent } from "@/lib/storage";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "budget", label: "Budget" },
  { id: "schedule", label: "Schedule" },
  { id: "checklist", label: "Checklist" },
  { id: "vendors", label: "Vendors" },
  { id: "ideas", label: "Ideas & invite" },
  { id: "copilot", label: "✦ Copilot" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function friendly(message: string | undefined): string {
  if (!message) return "";
  try {
    const parsed = JSON.parse(message);
    if (parsed?.error) return String(parsed.error);
  } catch { /* not JSON */ }
  return message;
}

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<StoredEvent | null | undefined>(undefined);
  const [tab, setTab] = useState<TabId>("overview");
  const [printing, setPrinting] = useState(false);
  const [toast, setToast] = useState("");
  const [genError, setGenError] = useState("");
  const recordRef = useRef<StoredEvent | null>(null);
  const startedRef = useRef(false);

  const persist = useCallback((next: StoredEvent) => {
    recordRef.current = next;
    setRecord(next);
    saveEvent(next);
  }, []);

  const { object, submit, isLoading, error } = useObject({
    api: "/api/plan/stream",
    schema: PlanSchema,
    onFinish: ({ object: final, error: err }) => {
      const rec = recordRef.current;
      if (!rec) return;
      if (!final) {
        setGenError(friendly(err?.message) || "The AI’s response was incomplete. Please try again.");
        return;
      }
      persist({ ...rec, plan: normalizePlan(final, rec.intake) });
    },
  });

  // Load from localStorage
  useEffect(() => {
    const found = getEvent(id);
    recordRef.current = found;
    setRecord(found);
    if (found) document.title = `${found.intake.title} — Utsava`;
  }, [id]);

  // Kick off generation when the saved event has no plan yet
  useEffect(() => {
    if (!record || record.plan || startedRef.current) return;
    startedRef.current = true;
    submit(record.intake);
  }, [record, submit]);

  const retry = () => {
    const rec = recordRef.current;
    if (!rec) return;
    setGenError("");
    startedRef.current = true;
    submit(rec.intake);
  };

  // Print: render every section, then open the print dialog
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const t = requestAnimationFrame(() => window.print());
    return () => { window.removeEventListener("afterprint", done); cancelAnimationFrame(t); };
  }, [printing]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  if (record === undefined) {
    return (
      <div className="ambient min-h-screen"><SiteHeader />
        <main id="main" className="mx-auto max-w-6xl px-5 py-12"><div className="shimmer h-64" aria-busy="true" /></main>
      </div>
    );
  }
  if (record === null) {
    return (
      <div className="ambient min-h-screen"><SiteHeader />
        <main id="main" className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="h-display text-3xl font-semibold">We couldn’t find that plan</h1>
          <p className="mt-3 text-soft">Plans are saved privately in this browser. It may have been deleted or opened on another device.</p>
          <Link href="/create" className="btn btn-primary mt-8">Plan a new event</Link>
        </main>
      </div>
    );
  }

  const { intake } = record;
  const stored: StoredPlan | null = record.plan;
  const plan = (stored ?? (object as unknown as PartialPlan | undefined) ?? {}) as PartialPlan;
  const streaming = !stored && isLoading;
  const errorText = !stored ? genError || friendly(error?.message) : "";

  const sections = [
    list(plan.themes).length, plan.budget?.breakdown?.length, list(plan.schedule).length, list(plan.timeline).length,
    list(plan.checklist).length, list(plan.vendors).length, list(plan.culturalNotes).length, list(plan.risks).length, plan.invitation?.message ? 1 : 0,
  ].filter(Boolean).length;

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
    a.href = url; a.download = `${record.id}-timeline.ics`; a.click();
    URL.revokeObjectURL(url);
    flash("Calendar file downloaded");
  };

  const share = async () => {
    if (!stored) return;
    const text = planToText(stored, intake);
    try {
      if (navigator.share) await navigator.share({ title: stored.title, text });
      else { await navigator.clipboard.writeText(text); flash("Plan copied to clipboard"); }
    } catch { /* user cancelled */ }
  };

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const visible = TABS.filter((t) => t.id !== "copilot" || stored);
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const nextIndex = e.key === "Home" ? 0 : e.key === "End" ? visible.length - 1 : (index + dir + visible.length) % visible.length;
    const next = visible[nextIndex];
    setTab(next.id);
    requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus());
  };

  const show = (t: TabId) => printing || tab === t;
  const visibleTabs = TABS.filter((t) => t.id !== "copilot" || stored);

  return (
    <div className="ambient min-h-screen">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-5 py-8">
        {/* Hero */}
        <section className="surface relative overflow-hidden p-7 sm:p-9" aria-labelledby="plan-title">
          <div className="rangoli pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-60" aria-hidden="true" />
          <p className="chip">{intake.type}</p>
          <h1 id="plan-title" className="h-display relative mt-3 text-4xl font-semibold sm:text-5xl">{plan.title ?? intake.title}</h1>
          {plan.tagline ? <p className="h-display relative mt-2 text-lg italic text-kumkum">{plan.tagline}</p> : streaming ? <div className="mt-3 max-w-sm"><Skeleton lines={1} /></div> : null}
          <div className="relative mt-4 max-w-3xl text-soft">{plan.summary ?? (streaming ? <Skeleton lines={2} /> : null)}</div>

          <div className="no-print relative mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-ghost btn-sm" disabled={!stored} onClick={() => setPrinting(true)}>Save as PDF / Print</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!stored || !intake.date} onClick={downloadIcs} title={intake.date ? "" : "Add an event date to export a calendar"}>Add to calendar (.ics)</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!stored} onClick={share}>Share plan</button>
          </div>
        </section>

        {/* Live generation status */}
        {streaming && (
          <div role="status" aria-live="polite" className="no-print surface mt-5 flex items-center gap-4 p-4">
            <span aria-hidden="true" className="spin-slow inline-block text-2xl text-saffron">✦</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Utsava is writing your plan live…</p>
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
            <button type="button" onClick={retry} className="btn btn-primary btn-sm mt-3">Try again</button>
          </div>
        )}

        {/* Tabs */}
        <div className="no-print mt-8 overflow-x-auto" >
          <div role="tablist" aria-label="Plan sections" className="flex min-w-max gap-1 rounded-full border border-line bg-white p-1.5">
            {visibleTabs.map((t, i) => (
              <button key={t.id} id={`tab-${t.id}`} role="tab" type="button" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)} onKeyDown={(e) => onTabKey(e, i)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-gradient-to-r from-[#c2410c] to-kumkum text-white shadow" : "text-soft hover:bg-cream"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {show("overview") && <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview"><Overview plan={plan} intake={intake} streaming={streaming} /></div>}
          {show("budget") && <div role="tabpanel" id="panel-budget" aria-labelledby="tab-budget" className="print-section"><Budget plan={plan} guests={intake.guests} streaming={streaming} /></div>}
          {show("schedule") && <div role="tabpanel" id="panel-schedule" aria-labelledby="tab-schedule" className="print-section"><Schedule plan={plan} eventDate={intake.date} streaming={streaming} /></div>}
          {show("checklist") && <div role="tabpanel" id="panel-checklist" aria-labelledby="tab-checklist" className="print-section"><Checklist plan={plan} streaming={streaming} onToggle={toggle} /></div>}
          {show("vendors") && <div role="tabpanel" id="panel-vendors" aria-labelledby="tab-vendors" className="print-section"><Vendors plan={plan} streaming={streaming} /></div>}
          {show("ideas") && <div role="tabpanel" id="panel-ideas" aria-labelledby="tab-ideas" className="print-section"><Ideas plan={plan} streaming={streaming} /></div>}
          {!printing && tab === "copilot" && stored && (
            <div role="tabpanel" id="panel-copilot" aria-labelledby="tab-copilot" className="mx-auto max-w-2xl">
              <Copilot intake={intake} plan={stored} onApply={(p) => { const rec = recordRef.current; if (rec) persist({ ...rec, plan: p }); }} />
            </div>
          )}
        </div>

        <p className="no-print mt-10 text-center text-xs text-soft">AI-generated suggestions — confirm prices and availability with vendors. Your plan is saved privately in this browser.</p>
      </main>

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center no-print">
        {toast && <span className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-xl">{toast}</span>}
      </div>
    </div>
  );
}
