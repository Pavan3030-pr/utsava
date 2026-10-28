"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/format";
import { mergeProgress, normalizePlan } from "@/lib/plan-utils";
import { RefineResultSchema, type Intake, type RefineResult, type StoredPlan } from "@/lib/schemas";

interface Message {
  role: "user" | "assistant";
  text: string;
  changes?: string[];
  budgetBefore?: number;
  budgetAfter?: number;
  seconds?: number;
  duplicatesRemoved?: number;
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

const friendly = (raw: string | undefined): string => {
  if (!raw) return "Something went wrong. Please try again.";
  try { const j = JSON.parse(raw) as { error?: string }; if (j.error) return j.error; } catch { /* plain text */ }
  return raw.length > 200 ? "Something went wrong. Please try again." : raw;
};

export function Copilot({ intake, plan, onApply }: { intake: Intake; plan: StoredPlan; onApply: (p: StoredPlan) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Namaste! I can reshape this plan — change the budget, add rituals, adapt for weather or guests. Just ask." },
  ]);
  const [input, setInput] = useState("");
  const [healing, setHealing] = useState(false);
  const [undoDepth, setUndoDepth] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  // Everything the stream callbacks need lives in refs, so they never read a stale render.
  const planRef = useRef(plan); planRef.current = plan;
  const intakeRef = useRef(intake); intakeRef.current = intake;
  const onApplyRef = useRef(onApply); onApplyRef.current = onApply;
  const job = useRef<{ instruction: string; attempt: number; startedAt: number; before: StoredPlan } | null>(null);
  const turns = useRef<{ instruction: string; reply: string }[]>([]);
  const undoStack = useRef<StoredPlan[]>([]);
  const retryRef = useRef<() => void>(() => {});

  const apply = useCallback((result: RefineResult) => {
    const j = job.current; if (!j) return;
    const { meta: _meta, ...plain } = j.before; void _meta;
    const { core, schedule, ops, ideas } = result.updates;
    const merged = mergeProgress(plain, { ...plain, ...core, ...schedule, ...ops, ...ideas });
    // The user may have asked for a different budget, so don't snap back to the original number.
    const next = normalizePlan(merged, { ...intakeRef.current, budget: undefined }, new Date(), true);
    undoStack.current = [...undoStack.current.slice(-4), j.before];
    setUndoDepth(undoStack.current.length);
    onApplyRef.current(next);
    turns.current = [...turns.current, { instruction: j.instruction, reply: result.reply.slice(0, 400) }].slice(-3);
    setMessages((m) => [...m, {
      role: "assistant", text: result.reply, changes: result.changes,
      budgetBefore: j.before.budget.total, budgetAfter: next.budget.total,
      seconds: (performance.now() - j.startedAt) / 1000,
      duplicatesRemoved: next.meta?.duplicatesRemoved,
    }]);
    job.current = null;
    setHealing(false);
  }, []);

  /** Failed or malformed → silently retry on the fallback model (twice) before showing an error. */
  const fail = useCallback((err?: Error) => {
    const j = job.current; if (!j) return;
    const msg = friendly(err?.message);
    const fatal = /too many requests|not configured|cross-origin|too large/i.test(msg);
    if (!fatal && j.attempt < 2) {
      j.attempt += 1;
      setHealing(true);
      setTimeout(() => retryRef.current(), 350 * j.attempt);
      return;
    }
    job.current = null;
    setHealing(false);
    setMessages((m) => [...m, { role: "assistant", error: true, text: fatal ? msg : "I couldn’t complete that change. Try rephrasing, or ask for one change at a time." }]);
  }, []);

  const { submit, object, isLoading, stop } = useObject({
    api: "/api/plan/refine",
    schema: RefineResultSchema,
    onFinish: ({ object: done, error }) => { if (done) apply(done); else fail(error); },
    onError: (e) => fail(e),
  });

  const post = useCallback(() => {
    const j = job.current; if (!j) return;
    const { meta: _meta, ...plain } = j.before; void _meta;
    submit({ intake: intakeRef.current, plan: plain, instruction: j.instruction, attempt: j.attempt, history: turns.current });
  }, [submit]);
  retryRef.current = post;

  const busy = isLoading || healing;

  const send = (text: string) => {
    const instruction = text.trim();
    if (instruction.length < 3 || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: instruction }]);
    job.current = { instruction, attempt: 0, startedAt: performance.now(), before: planRef.current };
    post();
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    setUndoDepth(undoStack.current.length);
    if (!prev) return;
    onApplyRef.current(prev);
    turns.current = turns.current.slice(0, -1);
    setMessages((m) => [...m, { role: "assistant", text: "Done — I’ve reverted my last change." }]);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, object?.reply, busy]);
  useEffect(() => () => stop(), [stop]);

  const live = object as { reply?: string; changes?: (string | undefined)[] } | undefined;
  const liveChanges = (live?.changes ?? []).filter((c): c is string => !!c);

  return (
    <div className="surface flex h-[34rem] max-h-[75vh] flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-gold-soft to-rose-soft px-5 py-3">
        <div>
          <h3 className="h-display text-lg font-semibold">AI Copilot</h3>
          <p className="text-xs text-soft">Revises your plan, keeps the tasks you’ve ticked, never duplicates.</p>
        </div>
        <button type="button" onClick={undo} disabled={busy || undoDepth === 0} className="btn btn-ghost btn-sm shrink-0 disabled:opacity-40">↶ Undo</button>
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
              {(m.seconds !== undefined || !!m.duplicatesRemoved) && (
                <p className="mt-2 text-[11px] text-soft">
                  {m.seconds !== undefined && `Updated in ${m.seconds.toFixed(1)}s`}
                  {!!m.duplicatesRemoved && ` · merged ${m.duplicatesRemoved} repeated ${m.duplicatesRemoved === 1 ? "entry" : "entries"}`}
                </p>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start" role="status">
            <div className="max-w-[88%] rounded-2xl bg-cream px-4 py-3 text-sm">
              {live?.reply ? <p>{live.reply}</p> : <p className="text-soft">Thinking… <span className="inline-block animate-pulse">✦</span></p>}
              {liveChanges.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-soft">{liveChanges.map((c, j) => <li key={j}>{c}</li>)}</ul>}
              <p className="mt-2 text-[11px] text-soft">{healing ? "Retrying on a backup model…" : live?.reply ? "Rewriting your plan…" : "Reading your plan…"}</p>
            </div>
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
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
          <label htmlFor="copilot-input" className="sr-only">Ask the copilot to change your plan</label>
          <input id="copilot-input" value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Move the reception outdoors and add a live band" className="input" />
          <button type="submit" disabled={busy || input.trim().length < 3} className="btn btn-primary shrink-0">Send</button>
        </form>
      </div>
    </div>
  );
}
