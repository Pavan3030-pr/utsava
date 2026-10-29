"use client";

import { useState } from "react";
import { todayIso } from "@/lib/dates";
import { formatINR, formatINRFull, parseINR } from "@/lib/format";
import { summarizeLedger } from "@/lib/ledger";
import type { Expense, Ledger, StoredPlan } from "@/lib/schemas";
import { Panel } from "./ui";

const uid = () => Math.random().toString(36).slice(2, 10);

export function Spend({ plan, ledger, onChange }: { plan: StoredPlan; ledger: Ledger; onChange: (l: Ledger) => void }) {
  const today = todayIso();
  const sum = summarizeLedger(plan.budget.breakdown, ledger.expenses, today);
  const categories = plan.budget.breakdown.map((b) => b.category);
  const [form, setForm] = useState({ category: categories[0] ?? "Other", vendor: "", amount: "", paid: "", dueDate: "" });
  const [err, setErr] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseINR(form.amount);
    const paid = form.paid ? parseINR(form.paid) : 0;
    if (!form.vendor.trim() || amount === undefined || paid === undefined) { setErr("Add a vendor and a valid amount (e.g. 85000 or 85k)."); return; }
    if (paid > amount) { setErr("Paid can’t be more than the amount."); return; }
    setErr("");
    const exp: Expense = { id: uid(), category: form.category, vendor: form.vendor.trim().slice(0, 120), amount, paid, dueDate: form.dueDate || undefined };
    onChange({ ...ledger, expenses: [...ledger.expenses, exp] });
    setForm({ ...form, vendor: "", amount: "", paid: "", dueDate: "" });
  };
  const patch = (id: string, p: Partial<Expense>) => onChange({ ...ledger, expenses: ledger.expenses.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const remove = (id: string) => onChange({ ...ledger, expenses: ledger.expenses.filter((x) => x.id !== id) });

  const kpis = [
    { k: "Planned", v: formatINR(sum.planned), tone: "bg-cream" },
    { k: "Committed", v: formatINR(sum.committed), tone: "bg-gold-soft text-saffron-dark" },
    { k: "Paid", v: formatINR(sum.paid), tone: "bg-leaf-soft text-leaf" },
    { k: sum.headroom >= 0 ? "Headroom" : "Over budget", v: formatINR(Math.abs(sum.headroom)), tone: sum.headroom >= 0 ? "bg-cream" : "bg-rose-soft text-kumkum-dark" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((x) => (
          <div key={x.k} className={`rounded-2xl p-4 ${x.tone}`}>
            <p className="text-xs font-semibold uppercase tracking-wide">{x.k}</p>
            <p className="h-display mt-1 text-2xl font-semibold tabular-nums">{x.v}</p>
          </div>
        ))}
      </div>

      {sum.dueSoon.length > 0 && (
        <div role="status" className="rounded-2xl border border-saffron/40 bg-gold-soft p-4 text-sm">
          <p className="font-semibold text-saffron-dark">Payments due soon</p>
          <ul className="mt-1 space-y-1">
            {sum.dueSoon.map((d) => (
              <li key={d.id}>{d.vendor} — {formatINRFull(d.amount - d.paid)} {d.daysLeft < 0 ? <strong className="text-kumkum-dark">overdue by {-d.daysLeft}d</strong> : d.daysLeft === 0 ? <strong>due today</strong> : `in ${d.daysLeft}d`}</li>
            ))}
          </ul>
        </div>
      )}

      <Panel kicker="Planned vs actual" title="By category">
        <ul className="space-y-4">
          {sum.byCategory.map((c) => {
            const max = Math.max(c.planned, c.committed, 1);
            return (
              <li key={c.category}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold">{c.category} {c.over && <span className="ml-1 rounded-full bg-rose-soft px-2 py-0.5 text-[10px] font-bold uppercase text-kumkum-dark">over</span>}</span>
                  <span className="tabular-nums text-soft">{formatINR(c.committed)} of {formatINR(c.planned)}</span>
                </div>
                <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-[#f6ead7]" role="img" aria-label={`${c.category}: ${formatINR(c.committed)} committed of ${formatINR(c.planned)} planned, ${formatINR(c.paid)} paid`}>
                  <div className="absolute inset-y-0 left-0 rounded-full bg-saffron/60" style={{ width: `${(c.committed / max) * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-leaf" style={{ width: `${(c.paid / max) * 100}%` }} />
                  <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${(c.planned / max) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-soft">Green = paid · amber = committed · black tick = planned budget</p>
      </Panel>

      <Panel kicker="Log it" title="Add an expense">
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Add expense">
          <div><label htmlFor="ex-cat" className="field-label">Category</label>
            <select id="ex-cat" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {[...categories, "Other"].map((c) => <option key={c}>{c}</option>)}
            </select></div>
          <div><label htmlFor="ex-v" className="field-label">Vendor</label><input id="ex-v" className="input" maxLength={120} value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Sri Sai Caterers" /></div>
          <div><label htmlFor="ex-a" className="field-label">Amount (₹)</label><input id="ex-a" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="2.5L" /></div>
          <div><label htmlFor="ex-p" className="field-label">Paid so far</label><input id="ex-p" className="input" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} placeholder="50k" /></div>
          <div><label htmlFor="ex-d" className="field-label">Balance due on</label><input id="ex-d" type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          <div className="sm:col-span-2 lg:col-span-5 flex items-center gap-4">
            <button className="btn btn-primary" type="submit">Add expense</button>
            {err && <p role="alert" className="text-sm text-kumkum-dark">{err}</p>}
          </div>
        </form>
      </Panel>

      {ledger.expenses.length > 0 && (
        <Panel kicker={`${ledger.expenses.length} entries`} title="Expenses">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wide text-soft"><th className="py-2 pr-3">Vendor</th><th className="pr-3">Category</th><th className="pr-3 text-right">Amount</th><th className="pr-3 text-right">Paid</th><th className="pr-3">Due</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-line">
                {ledger.expenses.map((x) => (
                  <tr key={x.id}>
                    <td className="py-2.5 pr-3 font-semibold">{x.vendor}</td><td className="pr-3 text-soft">{x.category}</td>
                    <td className="pr-3 text-right tabular-nums">{formatINRFull(x.amount)}</td>
                    <td className="pr-3 text-right tabular-nums">{formatINRFull(x.paid)}</td>
                    <td className="pr-3 text-soft">{x.dueDate ?? "—"}</td>
                    <td className="whitespace-nowrap text-right">
                      {x.paid < x.amount && <button type="button" className="btn btn-ghost btn-sm mr-2" onClick={() => patch(x.id, { paid: x.amount })}>Mark paid<span className="sr-only"> for {x.vendor}</span></button>}
                      <button type="button" className="btn btn-ghost btn-sm" aria-label={`Delete ${x.vendor}`} onClick={() => remove(x.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
