import { checklistProgress } from "@/lib/plan-utils";
import type { PartialPlan } from "@/lib/schemas";
import { Waiting, list } from "./ui";

const PRIORITY: Record<string, string> = {
  high: "bg-rose-soft text-kumkum-dark",
  medium: "bg-gold-soft text-saffron-dark",
  low: "bg-leaf-soft text-leaf",
};

export function Checklist({ plan, streaming, onToggle }: { plan: PartialPlan; streaming: boolean; onToggle: (cat: number, item: number) => void }) {
  const cats = list(plan.checklist);
  const { done, total, percent } = checklistProgress({ checklist: cats });

  return (
    <div>
      <div className="surface mb-6 flex items-center gap-5 p-5">
        <div className="flex-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">Your progress</span>
            <span className="tabular-nums text-soft">{done} of {total} done</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#f6ead7]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Checklist completion">
            <div className="h-full rounded-full bg-gradient-to-r from-saffron to-kumkum transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <span className="h-display text-3xl font-semibold grad-text">{percent}%</span>
      </div>

      <Waiting streaming={streaming} label="checklist" ready={cats.length > 0}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c, ci) => (
            <fieldset key={`${c.category}-${ci}`} className="surface p-5">
              <legend className="sr-only">{c.category}</legend>
              <h3 className="font-semibold" aria-hidden="true">{c.category}</h3>
              <ul className="mt-3 space-y-3">
                {list(c.items).map((it, ii) => {
                  const id = `chk-${ci}-${ii}`;
                  return (
                    <li key={id} className="flex items-start gap-3">
                      <input id={id} type="checkbox" checked={!!it.completed} disabled={streaming} onChange={() => onToggle(ci, ii)}
                        className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded accent-[#b4234e]" />
                      <label htmlFor={id} className={`cursor-pointer text-sm leading-snug ${it.completed ? "text-soft line-through" : ""}`}>
                        {it.task}
                        {it.priority && <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY[it.priority] ?? ""}`}>{it.priority}</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}
        </div>
      </Waiting>
    </div>
  );
}
