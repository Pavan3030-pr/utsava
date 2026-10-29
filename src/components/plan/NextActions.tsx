import type { NextAction, TabTarget } from "@/lib/actions";
import { Panel } from "./ui";

const TONE = {
  urgent: { box: "border-kumkum bg-rose-soft", tag: "Needs attention", tagCls: "text-kumkum-dark" },
  soon: { box: "border-saffron bg-gold-soft", tag: "Coming up", tagCls: "text-saffron-dark" },
  tip: { box: "border-leaf bg-leaf-soft", tag: "Good next step", tagCls: "text-leaf" },
} as const;

export function NextActions({ actions, onGo }: { actions: NextAction[]; onGo: (tab: TabTarget) => void }) {
  if (actions.length === 0) return null;
  return (
    <Panel kicker="Next best moves" title="What to do next">
      <ul className="grid gap-3 md:grid-cols-2">
        {actions.map((a) => {
          const t = TONE[a.tone];
          return (
            <li key={a.id} className={`flex flex-col justify-between rounded-2xl border-l-4 p-4 md:[&:last-child:nth-child(odd)]:col-span-2 ${t.box}`}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wide ${t.tagCls}`}>{t.tag}</p>
                <p className="mt-1 font-semibold leading-snug text-ink">{a.title}</p>
                <p className="mt-1 text-sm text-ink/80">{a.detail}</p>
              </div>
              <button type="button" onClick={() => onGo(a.tab)} className="btn btn-ghost btn-sm mt-3 self-start">{a.cta} →</button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
