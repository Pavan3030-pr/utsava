"use client";

import { useEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/format";
import { mergeProgress, normalizePlan } from "@/lib/plan-utils";
import { RefineResultSchema, type Intake, type StoredPlan } from "@/lib/schemas";

interface Message {
  role: "user" | "assistant";
  text: string;
  changes?: string[];
  budgetBefore?: number;
  budgetAfter?: number;
  error?: boolean;
}

const SUGGESTIONS = [
  "Cut the total budget by 15%",
  "Make it more traditional",
  "Add a pure-vegetarian menu plan",
  "Plan for rain on the day",
  "Add activities for kids",
  "Make it more eco-friendly",
];

export function Copilot({ intake, plan, onApply }: { intake: Intake; plan: StoredPlan; onApply: (p: StoredPlan) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Namaste! I can reshape this plan — change the budget, add rituals, adapt for weather or guests. Just ask." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  const send = async (text: string) => {
    const instruction = text.trim();
    if (instruction.length < 3 || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: instruction }]);
    try {
      const { meta: _meta, ...plain } = plan;
      void _meta;
      const res = await fetch("/api/plan/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake, plan: plain, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Request failed");
      const parsed = RefineResultSchema.safeParse(data);
      if (!parsed.success) throw new Error("The AI returned an unexpected format. Please try again.");

      const { core, schedule, ops, ideas } = parsed.data.updates;
      const revised = { ...plain, ...core, ...schedule, ...ops, ...ideas };
      const merged = mergeProgress(plain, revised);
      // The user may have just asked for a different budget, so don't snap back to the original.
      const next = normalizePlan(merged, { ...intake, budget: undefined }, new Date(), true);
      onApply(next);
      setMessages((m) => [...m, {
        role: "assistant", text: parsed.data.reply, changes: parsed.data.changes,
        budgetBefore: plan.budget.total, budgetAfter: next.budget.total,
      }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", error: true, text: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface flex h-[34rem] max-h-[75vh] flex-col overflow-hidden">
      <div className="border-b border-line bg-gradient-to-r from-gold-soft to-rose-soft px-5 py-3">
        <h3 className="h-display text-lg font-semibold">AI Copilot</h3>
        <p className="text-xs text-soft">Revises the whole plan and keeps the tasks you’ve ticked.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5" role="log" aria-live="polite" aria-label="Conversation with Utsava copilot">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-kumkum text-white" : m.error ? "bg-rose-soft text-kumkum-dark" : "bg-cream"}`}>
              <p>{m.text}</p>
              {m.budgetBefore !== undefined && m.budgetAfter !== undefined && m.budgetBefore !== m.budgetAfter && (
                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">
                  Budget {formatINR(m.budgetBefore)} → {formatINR(m.budgetAfter)}
                  <span className={m.budgetAfter < m.budgetBefore ? "text-leaf" : "text-kumkum"}>
                    ({m.budgetAfter < m.budgetBefore ? "−" : "+"}{formatINR(Math.abs(m.budgetAfter - m.budgetBefore))})
                  </span>
                </p>
              )}
              {m.changes && m.changes.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-soft">{m.changes.map((c, j) => <li key={j}>{c}</li>)}</ul>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start" role="status">
            <div className="rounded-2xl bg-cream px-4 py-3 text-sm text-soft">Rewriting your plan… <span className="inline-block animate-pulse">✦</span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => send(s)}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs text-soft transition hover:border-kumkum hover:text-kumkum disabled:opacity-50">{s}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-2">
          <label htmlFor="copilot-input" className="sr-only">Ask the copilot to change your plan</label>
          <input id="copilot-input" value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Move the reception outdoors and add a live band" className="input" />
          <button type="submit" disabled={busy || input.trim().length < 3} className="btn btn-primary shrink-0">Send</button>
        </form>
      </div>
    </div>
  );
}
