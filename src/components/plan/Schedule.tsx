import { addDays, formatDate, phaseLabel } from "@/lib/dates";
import type { PartialPlan } from "@/lib/schemas";
import { Panel, Waiting, list } from "./ui";

export function Schedule({ plan, eventDate, streaming }: { plan: PartialPlan; eventDate?: string; streaming: boolean }) {
  const days = list(plan.schedule);
  const steps = list(plan.timeline);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel kicker="Run of show" title="Event schedule">
        <Waiting streaming={streaming} label="schedule" ready={days.length > 0}>
          <div className="space-y-6">
            {days.map((d, i) => (
              <div key={`${d.day}-${i}`}>
                <h4 className="flex flex-wrap items-center gap-2 font-semibold">
                  <span className="chip">{d.day}</span> {d.name}
                </h4>
                {d.vibe && <p className="mt-1 text-sm italic text-soft">{d.vibe}</p>}
                <ol className="mt-3 space-y-2 border-l-2 border-line pl-4">
                  {list(d.items).map((it, j) => (
                    <li key={j} className="text-sm"><span className="mr-2 font-semibold tabular-nums text-kumkum">{it.time}</span>{it.activity}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Waiting>
      </Panel>

      <Panel kicker="Countdown" title="Planning timeline">
        <Waiting streaming={streaming} label="timeline" ready={steps.length > 0}>
          <ol className="relative">
            {steps.map((t, i) => (
              <li key={`${t.daysBefore}-${i}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-kumkum ring-4 ring-rose-soft" aria-hidden="true" />
                  {i < steps.length - 1 && <span className="my-1 w-0.5 flex-1 bg-line" aria-hidden="true" />}
                </div>
                <div className="pb-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-kumkum">
                    {typeof t.daysBefore === "number" ? phaseLabel(t.daysBefore) : "…"}
                    {eventDate && typeof t.daysBefore === "number" && <span className="ml-2 font-medium normal-case text-soft">{formatDate(addDays(eventDate, -t.daysBefore))}</span>}
                  </p>
                  <p className="mt-0.5 font-semibold">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-sm text-soft">{t.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Waiting>
      </Panel>
    </div>
  );
}
