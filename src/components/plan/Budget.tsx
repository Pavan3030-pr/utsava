import { formatINR, formatINRFull } from "@/lib/format";
import type { PartialPlan } from "@/lib/schemas";
import { Panel, Waiting, list } from "./ui";

export const COLORS = ["#b4234e", "#f59e0b", "#0f766e", "#7c3aed", "#ea580c", "#0369a1", "#65a30d", "#be185d", "#92400e"];

export function Budget({ plan, guests, streaming }: { plan: PartialPlan; guests?: number; streaming: boolean }) {
  const lines = list(plan.budget?.breakdown).filter((b) => b.category && typeof b.amount === "number");
  const total = plan.budget?.total ?? lines.reduce((s, b) => s + (b.amount ?? 0), 0);
  const base = total || 1;
  let cumulative = 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Panel kicker="Total budget" title={total ? formatINR(total) : "…"}>
        <Waiting streaming={streaming} label="budget" ready={lines.length > 0}>
          <svg viewBox="0 0 42 42" className="mx-auto h-56 w-56 -rotate-90" role="img" aria-label={`Budget split across ${lines.length} categories`}>
            <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f6ead7" strokeWidth="6" pathLength={100} />
            {lines.map((b, i) => {
              const pct = ((b.amount ?? 0) / base) * 100;
              const el = (
                <circle key={b.category} cx="21" cy="21" r="15.915" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="6"
                  pathLength={100} strokeDasharray={`${Math.max(pct - 0.6, 0)} ${100 - Math.max(pct - 0.6, 0)}`} strokeDashoffset={-cumulative} />
              );
              cumulative += pct;
              return el;
            })}
          </svg>
          {guests && total ? (
            <p className="mt-2 text-center text-sm text-soft">≈ <strong className="text-ink">{formatINRFull(Math.round(total / guests))}</strong> per guest</p>
          ) : null}
          {plan.meta?.budgetAdjusted !== undefined && (
            <p className="mt-4 rounded-xl bg-leaf-soft px-3 py-2 text-xs text-leaf">
              <span aria-hidden="true">✓</span> Verified: every line adds up to {formatINRFull(total)}
              {plan.meta.budgetAdjusted ? " (AI figures were rebalanced)" : ""}.
            </p>
          )}
        </Waiting>
      </Panel>

      <Panel kicker="Where it goes" title="Breakdown">
        <ul className="space-y-5">
          {lines.map((b, i) => {
            const pct = ((b.amount ?? 0) / base) * 100;
            return (
              <li key={b.category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-semibold">
                    <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {b.category}
                  </span>
                  <span className="tabular-nums text-soft">{formatINR(b.amount)} · {b.percentage ?? Math.round(pct)}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#f6ead7]" role="presentation">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: COLORS[i % COLORS.length] }} />
                </div>
                {b.notes && <p className="mt-2 text-sm text-soft">{b.notes}</p>}
                {b.savingTip && <p className="mt-1 text-sm text-leaf"><span aria-hidden="true">💡</span> {b.savingTip}</p>}
              </li>
            );
          })}
        </ul>
        {streaming && lines.length === 0 && <Waiting streaming label="breakdown" ready={false}>{null}</Waiting>}
      </Panel>
    </div>
  );
}
