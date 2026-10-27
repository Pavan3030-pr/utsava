import { PART_LABELS, PLAN_PARTS, type PlanPart } from "@/lib/schemas";

export type PartState = "waiting" | "writing" | "done";

/** Live view of the parallel Gemini calls. Each row is a real request, not decoration. */
export function GenerationStatus({ states, elapsedMs }: { states: Record<PlanPart, PartState>; elapsedMs: number }) {
  const done = PLAN_PARTS.filter((p) => states[p] === "done").length;
  return (
    <section className="no-print surface mt-6 p-5 sm:p-6" aria-labelledby="gen-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="spin-slow inline-block text-2xl text-saffron">✦</span>
          <h2 id="gen-title" className="text-base font-semibold">Four AI planners are writing in parallel</h2>
        </div>
        <span aria-hidden="true" className="rounded-full bg-cream px-3 py-1 text-sm font-semibold tabular-nums text-soft">{(elapsedMs / 1000).toFixed(1)}s</span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{done} of {PLAN_PARTS.length} sections ready</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_PARTS.map((p) => {
          const st = states[p];
          return (
            <li key={p} className={`rounded-2xl border px-4 py-3 transition-colors ${st === "done" ? "border-leaf/30 bg-leaf-soft" : st === "writing" ? "border-saffron/40 bg-gold-soft" : "border-line bg-white"}`}>
              <p className="text-sm font-semibold">{PART_LABELS[p]}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-soft">
                {st === "done" ? <><span aria-hidden="true" className="text-leaf">✓</span> Ready</> : st === "writing" ? <><span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-saffron" /> Writing…</> : "Starting…"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
