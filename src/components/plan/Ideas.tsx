"use client";

import { useState } from "react";
import { safePalette } from "@/lib/plan-utils";
import type { PartialPlan } from "@/lib/schemas";
import { Panel, Waiting, list } from "./ui";

export function Ideas({ plan, streaming }: { plan: PartialPlan; streaming: boolean }) {
  const themes = list(plan.themes);
  const invite = plan.invitation?.message;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="space-y-6">
      <Waiting streaming={streaming} label="themes" ready={themes.length > 0}>
        <div className="grid gap-5 md:grid-cols-2">
          {themes.map((t, i) => {
            const palette = safePalette(list(t.palette));
            return (
              <article key={`${t.name}-${i}`} className="surface surface-hover overflow-hidden">
                <div className="h-36" aria-hidden="true"
                  style={{ background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 55%, ${palette[2] ?? palette[0]} 100%)` }}>
                  <div className="rangoli h-full w-full opacity-60" />
                </div>
                <div className="p-6">
                  <h3 className="h-display text-xl font-semibold">{t.name}</h3>
                  <ul className="mt-3 flex gap-2" aria-label="Colour palette">
                    {palette.map((c) => (
                      <li key={c} className="h-7 w-7 rounded-full border border-black/10" style={{ background: c }} title={c}><span className="sr-only">{c}</span></li>
                    ))}
                  </ul>
                  {t.description && <p className="mt-3 text-sm text-soft">{t.description}</p>}
                  {list(t.decor).length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{list(t.decor).map((d, j) => <li key={j}>{d}</li>)}</ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Waiting>

      <Panel kicker={plan.invitation?.language ?? "Invitation"} title="WhatsApp-ready invitation">
        <Waiting streaming={streaming} label="invitation" ready={!!invite}>
          <p className="whitespace-pre-wrap rounded-2xl bg-leaf-soft p-5 text-sm leading-relaxed">{invite}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={copy} className="btn btn-ghost btn-sm">{copied ? "Copied ✓" : "Copy message"}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(invite ?? "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
              Share on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <p aria-live="polite" className="sr-only">{copied ? "Invitation copied to clipboard" : ""}</p>
        </Waiting>
      </Panel>
    </div>
  );
}
