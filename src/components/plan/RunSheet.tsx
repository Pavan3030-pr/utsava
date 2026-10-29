"use client";

import { useState } from "react";
import { formatDate, todayIso } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { whatsappUrl } from "@/lib/guests";
import { buildRunSheet, runSheetToText } from "@/lib/runsheet";
import type { Intake, Ledger, StoredPlan } from "@/lib/schemas";
import { Panel } from "./ui";

export function RunSheet({ plan, intake, ledger }: { plan: StoredPlan; intake: Intake; ledger: Ledger }) {
  const rs = buildRunSheet(plan, intake, ledger, todayIso());
  const [copied, setCopied] = useState(false);
  const text = runSheetToText(rs);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } };

  return (
    <div className="space-y-6">
      <Panel kicker="Day-of run sheet" title={rs.title}>
        <p className="text-sm text-soft">
          {[rs.date && formatDate(rs.date), rs.location, rs.plannedGuests ? `${rs.plannedGuests} guests planned` : ""].filter(Boolean).join(" · ") || "Add a date and city to complete this sheet."}
          {rs.daysToGo !== undefined && rs.daysToGo >= 0 && <span className="ml-2 font-semibold text-kumkum">{rs.daysToGo === 0 ? "Today!" : `${rs.daysToGo} days to go`}</span>}
        </p>
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>Print this sheet</button>
          <a className="btn btn-ghost btn-sm" href={whatsappUrl(undefined, text)} target="_blank" rel="noopener noreferrer">Send to coordinator<span className="sr-only"> on WhatsApp (opens in a new tab)</span></a>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>{copied ? "Copied ✓" : "Copy as text"}</button>
        </div>
      </Panel>

      <Panel kicker="Schedule" title="Minute by minute">
        {rs.days.length === 0 ? <p className="text-sm text-soft">No schedule yet.</p> : (
          <div className="space-y-5">
            {rs.days.map((d, i) => (
              <section key={`${d.day}-${d.name}-${i}`} aria-label={`${d.name} schedule`}>
                <h3 className="font-semibold">{d.name} <span className="ml-1 text-sm font-normal text-soft">· {d.day}</span></h3>
                <ol className="mt-2 divide-y divide-line rounded-2xl border border-line">
                  {d.items.map((it, j) => (
                    <li key={j} className="flex gap-4 px-4 py-2 text-sm"><span className="w-20 shrink-0 font-semibold tabular-nums text-kumkum">{it.time}</span><span>{it.activity}</span></li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Who to call" title="Vendor contacts">
          {rs.vendors.length === 0 ? (
            <p className="text-sm text-soft">Mark vendors as <strong>booked</strong> or <strong>quoted</strong> in the Vendors tab and their numbers appear here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rs.vendors.map((v, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0"><p className="font-semibold">{v.name}</p><p className="text-xs text-soft">{v.category} · {v.status === "booked" ? "booked" : "quote only"}</p></div>
                  {v.phone ? <a className="btn btn-ghost btn-sm shrink-0" href={`tel:${v.phone.replace(/[^\d+]/g, "")}`}>Call {v.phone}</a> : <span className="text-xs text-soft">no number saved</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel kicker="Don’t forget" title="Still open">
          {rs.openTasks.length === 0 && rs.paymentsDue.length === 0 ? (
            <p className="text-sm text-soft">Nothing urgent is open. 🎉</p>
          ) : (
            <div className="space-y-4 text-sm">
              {rs.openTasks.length > 0 && <ul className="space-y-1.5">{rs.openTasks.map((t) => <li key={t} className="flex gap-2"><span aria-hidden="true">☐</span><span>{t}</span></li>)}</ul>}
              {rs.paymentsDue.length > 0 && (
                <div>
                  <p className="font-semibold">Payments</p>
                  <ul className="mt-1 space-y-1">{rs.paymentsDue.map((p, i) => <li key={i}>{p.who}: {formatINR(p.remaining)} — <span className={p.daysLeft < 0 ? "font-semibold text-kumkum-dark" : ""}>{p.daysLeft < 0 ? "overdue" : p.daysLeft === 0 ? "due today" : `due in ${p.daysLeft} days`}</span></li>)}</ul>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
