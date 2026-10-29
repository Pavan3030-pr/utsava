"use client";

import { useState } from "react";
import { formatINRFull, parseINR } from "@/lib/format";
import type { Ledger, PartialPlan, ShortlistItem, ShortlistStatus } from "@/lib/schemas";
import { isDuplicateVendor } from "@/lib/dedupe";
import type { PlaceResult } from "@/lib/place-categories";
import { Panel, Waiting, list } from "./ui";
import { VendorFinder } from "./VendorFinder";

const STAGES: { id: ShortlistStatus; label: string; tone: string }[] = [
  { id: "shortlisted", label: "Shortlisted", tone: "bg-cream" },
  { id: "quoted", label: "Quote received", tone: "bg-gold-soft" },
  { id: "booked", label: "Booked ✓", tone: "bg-leaf-soft" },
  { id: "rejected", label: "Passed", tone: "bg-[#f3ece2]" },
];
const uid = () => Math.random().toString(36).slice(2, 10);

export function Vendors({ plan, streaming, ledger, city, onLedger }: {
  plan: PartialPlan; streaming: boolean; ledger?: Ledger; city?: string; onLedger?: (l: Ledger) => void;
}) {
  const vendors = list(plan.vendors);
  const categories = vendors.map((v) => v.category).filter((c): c is string => !!c);
  const [form, setForm] = useState({ category: "", name: "", phone: "", quote: "" });
  const [err, setErr] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledger || !onLedger) return;
    const quote = form.quote ? parseINR(form.quote) : undefined;
    if (!form.name.trim() || (form.quote && quote === undefined)) { setErr("Add a vendor name (and a valid quote like 85k)."); return; }
    if (isDuplicateVendor(ledger.shortlist, form.name, form.category || categories[0] || "Other")) { setErr("That vendor is already on your shortlist."); return; }
    setErr("");
    const item: ShortlistItem = { id: uid(), category: form.category || categories[0] || "Other", name: form.name.trim().slice(0, 120), phone: form.phone.trim() || undefined, quote, status: quote ? "quoted" : "shortlisted" };
    onLedger({ ...ledger, shortlist: [...ledger.shortlist, item] });
    setForm({ ...form, name: "", phone: "", quote: "" });
  };
  const setStatus = (id: string, status: ShortlistStatus) =>
    ledger && onLedger && onLedger({ ...ledger, shortlist: ledger.shortlist.map((s) => (s.id === id ? { ...s, status } : s)) });
  const shortlistedNames = new Set((ledger?.shortlist ?? []).map((s) => s.name.toLowerCase()));
  const addPlace = (category: string, p: PlaceResult) => {
    if (!ledger || !onLedger || shortlistedNames.has(p.name.toLowerCase())) return;
    onLedger({ ...ledger, shortlist: [...ledger.shortlist, { id: uid(), category, name: p.name.slice(0, 120), phone: p.phone, status: "shortlisted", notes: [p.address, p.website].filter(Boolean).join(" · ").slice(0, 300) || undefined }] });
  };
  const del = (id: string) => ledger && onLedger && onLedger({ ...ledger, shortlist: ledger.shortlist.filter((s) => s.id !== id) });

  return (
    <div className="space-y-8">
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
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-soft">{list(v.questionsToAsk).map((q, j) => <li key={j}>{q}</li>)}</ul>
                </details>
              )}
              {v.category && (
                <a className="mt-4 inline-block text-sm font-semibold text-kumkum hover:underline" target="_blank" rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${v.category} ${city ?? ""}`.trim())}`}>
                  Find {v.category.toLowerCase()} {city ? `in ${city}` : "near you"} →<span className="sr-only"> (opens Google Maps in a new tab)</span>
                </a>
              )}
              {v.category && city && ledger && onLedger && !streaming && (
                <VendorFinder category={v.category} city={city} shortlisted={shortlistedNames} onAdd={(p) => addPlace(v.category as string, p)} />
              )}
            </article>
          ))}
        </div>
      </Waiting>

      {ledger && onLedger && !streaming && (
        <Panel kicker="Your pipeline" title="Vendor shortlist">
          <form onSubmit={add} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Add vendor to shortlist">
            <div><label htmlFor="sl-c" className="field-label">Category</label>
              <select id="sl-c" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {[...categories, "Other"].map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div><label htmlFor="sl-n" className="field-label">Vendor</label><input id="sl-n" className="input" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Lens & Lore Studios" /></div>
            <div><label htmlFor="sl-p" className="field-label">Phone</label><input id="sl-p" className="input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label htmlFor="sl-q" className="field-label">Quote (₹)</label><input id="sl-q" className="input" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder="85k" /></div>
            <div className="flex items-end"><button className="btn btn-primary w-full" type="submit">Add</button></div>
          </form>
          {err && <p role="alert" className="mt-3 text-sm text-kumkum-dark">{err}</p>}

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {STAGES.map((stage) => {
              const items = ledger.shortlist.filter((s) => s.status === stage.id);
              return (
                <section key={stage.id} className={`rounded-2xl p-3 ${stage.tone}`} aria-label={stage.label}>
                  <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-soft">{stage.label} · {items.length}</h3>
                  <ul className="mt-2 space-y-2">
                    {items.map((s) => (
                      <li key={s.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-soft">{s.category}{s.quote ? ` · ${formatINRFull(s.quote)}` : ""}</p>
                        {s.phone && <a className="text-xs font-semibold text-kumkum" href={`tel:${s.phone}`}>Call {s.phone}</a>}
                        <div className="mt-2 flex items-center gap-2">
                          <label className="sr-only" htmlFor={`st-${s.id}`}>Stage for {s.name}</label>
                          <select id={`st-${s.id}`} className="input !min-h-0 !py-1 text-xs" value={s.status} onChange={(e) => setStatus(s.id, e.target.value as ShortlistStatus)}>
                            {STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                          </select>
                          <button type="button" className="text-xs text-soft hover:text-kumkum" aria-label={`Remove ${s.name}`} onClick={() => del(s.id)}>✕</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
