import { daysBetween, formatDate, todayIso } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { checklistProgress, upcomingMilestones } from "@/lib/plan-utils";
import type { Intake, PartialPlan } from "@/lib/schemas";
import { Panel, Waiting, list } from "./ui";
import { WeatherCard } from "./WeatherCard";

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className={`rounded-2xl p-4 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="h-display mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
    </div>
  );
}

export function Overview({ plan, intake, streaming }: { plan: PartialPlan; intake: Intake; streaming: boolean }) {
  const days = intake.date ? daysBetween(todayIso(), intake.date) : undefined;
  const progress = checklistProgress(plan);
  const notes = list(plan.culturalNotes);
  const next = upcomingMilestones(list(plan.timeline), intake.date, todayIso());
  const risks = list(plan.risks);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Budget" value={formatINR(plan.budget?.total ?? intake.budget)} sub={intake.guests ? `${intake.guests} guests` : undefined} tone="bg-rose-soft text-kumkum-dark" />
        <Kpi label="Date" value={intake.date ? formatDate(intake.date) : "Flexible"} sub={days === undefined ? undefined : days >= 0 ? `${days} days to go` : "date has passed"} tone="bg-gold-soft text-saffron-dark" />
        <Kpi label="Checklist" value={`${progress.percent}%`} sub={`${progress.done}/${progress.total} tasks`} tone="bg-leaf-soft text-leaf" />
        <Kpi label="Location" value={intake.location || "India"} sub={intake.style} tone="bg-cream text-ink" />
      </div>

      {next.length > 0 && (
        <Panel kicker="Up next" title="Your next milestones">
          <ul className="grid gap-4 sm:grid-cols-3">
            {next.map((m) => (
              <li key={`${m.date}-${m.title}`} className="rounded-2xl bg-cream/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-kumkum">{m.daysLeft === 0 ? "Today" : `In ${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"}`} · {formatDate(m.date)}</p>
                <p className="mt-1.5 font-semibold leading-snug">{m.title}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {!streaming && intake.date && intake.location && daysBetween(todayIso(), intake.date) >= 0 && (
        <WeatherCard city={intake.location} date={intake.date} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Cultural notes" title="Honouring tradition">
          <Waiting streaming={streaming} label="cultural notes" ready={notes.length > 0}>
            <ul className="space-y-3 text-sm">
              {notes.map((n, i) => (
                <li key={i} className="flex gap-3"><span aria-hidden="true" className="mt-0.5 text-saffron">🪔</span><span>{n}</span></li>
              ))}
            </ul>
          </Waiting>
        </Panel>

        <Panel kicker="Contingency" title="What could go wrong — and the fix">
          <Waiting streaming={streaming} label="risks" ready={risks.length > 0}>
            <ul className="space-y-4 text-sm">
              {risks.map((r, i) => (
                <li key={i}>
                  <p className="font-semibold text-kumkum-dark">⚠ {r.risk}</p>
                  <p className="mt-0.5 text-soft">→ {r.mitigation}</p>
                </li>
              ))}
            </ul>
          </Waiting>
        </Panel>
      </div>
    </div>
  );
}
