import type { PartialPlan } from "@/lib/schemas";
import { Waiting, list } from "./ui";

export function Vendors({ plan, streaming }: { plan: PartialPlan; streaming: boolean }) {
  const vendors = list(plan.vendors);
  return (
    <Waiting streaming={streaming} label="vendor playbook" ready={vendors.length > 0}>
      <div className="grid gap-5 md:grid-cols-2">
        {vendors.map((v, i) => (
          <article key={`${v.category}-${i}`} className="surface surface-hover p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="h-display text-xl font-semibold">{v.category}</h3>
              {v.estimatedRange && <span className="chip shrink-0">{v.estimatedRange}</span>}
            </div>
            {v.whatToLookFor && <p className="mt-2 text-sm text-soft">{v.whatToLookFor}</p>}
            {v.bookBy && <p className="mt-3 text-sm"><span className="font-semibold text-kumkum">Book by:</span> {v.bookBy}</p>}
            {list(v.questionsToAsk).length > 0 && (
              <details className="mt-3 rounded-xl bg-cream/60 px-4 py-3 text-sm">
                <summary className="cursor-pointer font-semibold">Questions to ask</summary>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-soft">
                  {list(v.questionsToAsk).map((q, j) => <li key={j}>{q}</li>)}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>
    </Waiting>
  );
}
