"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { formatDate } from "@/lib/dates";
import { safePalette } from "@/lib/plan-utils";

interface Invite {
  guest: { name: string; invited: string[] };
  event: { title: string; tagline: string; date: string | null; location: string | null; palette: string[];
    schedule: { day: string; name: string; vibe: string; items: { time: string; activity: string }[] }[] };
  responses: { event: string; status: "yes" | "no" | "maybe"; partySize: number; note: string }[];
}
type Answer = { status: "yes" | "no" | "maybe" | ""; partySize: number; note: string };

export default function RsvpPage() {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [state, setState] = useState<"loading" | "ready" | "error" | "saving" | "done">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/rsvp/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Invitation not found");
        setInvite(data);
        const init: Record<string, Answer> = {};
        for (const e of data.guest.invited as string[]) {
          const prev = (data.responses as Invite["responses"]).find((r) => r.event === e);
          init[e] = { status: prev?.status ?? "", partySize: prev?.partySize ?? 1, note: prev?.note ?? "" };
        }
        setAnswers(init);
        setState("ready");
      } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); setState("error"); }
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const responses = Object.entries(answers).filter(([, a]) => a.status).map(([event, a]) => ({ event, status: a.status, partySize: a.partySize, note: a.note || undefined }));
    if (responses.length === 0) { setError("Please choose a response for at least one event."); return; }
    setState("saving"); setError("");
    try {
      const res = await fetch(`/api/rsvp/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ responses }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn’t save");
      setState("done");
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t save"); setState("ready"); }
  };

  if (state === "loading") return <main id="main" className="mx-auto max-w-xl p-8"><div className="shimmer h-80" aria-busy="true" /></main>;
  if (state === "error" || !invite) {
    return (
      <main id="main" className="ambient flex min-h-screen items-center justify-center p-6 text-center">
        <div><LogoMark size={48} /><h1 className="h-display mt-5 text-3xl font-semibold">Invitation unavailable</h1><p className="mt-2 text-soft" role="alert">{error}</p></div>
      </main>
    );
  }

  const p = safePalette(invite.event.palette);
  return (
    <div className="ambient min-h-screen">
      <header className="relative overflow-hidden px-6 py-14 text-center text-white" style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]} 60%, ${p[2] ?? p[0]})` }}>
        <div className="rangoli absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/45" aria-hidden="true" />
        <div className="relative mx-auto max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/90">You’re invited</p>
          <h1 className="h-display mt-3 text-4xl font-semibold drop-shadow sm:text-5xl">{invite.event.title}</h1>
          <p className="h-display mt-2 italic text-white/95">{invite.event.tagline}</p>
          <p className="mt-4 text-sm text-white/95">{[invite.event.date && formatDate(invite.event.date), invite.event.location].filter(Boolean).join(" · ")}</p>
        </div>
      </header>

      <main id="main" className="mx-auto -mt-6 max-w-xl px-5 pb-16">
        {state === "done" ? (
          <div className="surface fade-up p-10 text-center" role="status">
            <p className="text-5xl" aria-hidden="true">🎉</p>
            <h2 className="h-display mt-4 text-3xl font-semibold">Thank you, {invite.guest.name}!</h2>
            <p className="mt-2 text-soft">Your response has been shared with the hosts. You can reopen this link any time to change it.</p>
            <button type="button" className="btn btn-ghost mt-6" onClick={() => setState("ready")}>Edit my response</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" aria-label="RSVP">
            <p className="surface p-5 text-center">Namaste <strong>{invite.guest.name}</strong> 🙏 — will you join us?</p>
            {invite.guest.invited.map((ev) => {
              const day = invite.event.schedule.find((s) => s.name === ev);
              const a = answers[ev] ?? { status: "", partySize: 1, note: "" };
              const set = (patch: Partial<Answer>) => setAnswers((x) => ({ ...x, [ev]: { ...a, ...patch } }));
              return (
                <fieldset key={ev} className="surface p-6">
                  <legend className="sr-only">{ev}</legend>
                  <h2 className="h-display text-2xl font-semibold" aria-hidden="true">{ev}</h2>
                  {day && <p className="text-sm italic text-soft">{day.day} · {day.vibe}</p>}
                  {day && (
                    <ol className="mt-3 space-y-1 border-l-2 border-line pl-4 text-sm">
                      {day.items.slice(0, 5).map((it, i) => <li key={i}><span className="mr-2 font-semibold text-kumkum">{it.time}</span>{it.activity}</li>)}
                    </ol>
                  )}
                  <div className="mt-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label={`Will you attend ${ev}?`}>
                    {([["yes", "Joyfully accept"], ["maybe", "Not sure"], ["no", "Regretfully decline"]] as const).map(([v, label]) => (
                      <label key={v} className="cursor-pointer rounded-xl border border-line bg-white px-2 py-3 text-center text-xs font-semibold has-[:checked]:border-kumkum has-[:checked]:bg-rose-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2">
                        <input type="radio" className="sr-only" name={`s-${ev}`} checked={a.status === v} onChange={() => set({ status: v })} />{label}
                      </label>
                    ))}
                  </div>
                  {a.status && a.status !== "no" && (
                    <div className="mt-4">
                      <label htmlFor={`n-${ev}`} className="field-label">How many people (including you)?</label>
                      <input id={`n-${ev}`} type="number" min={1} max={20} className="input" value={a.partySize} onChange={(e) => set({ partySize: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} />
                    </div>
                  )}
                  {a.status && (
                    <div className="mt-4">
                      <label htmlFor={`m-${ev}`} className="field-label">A note for the hosts (diet, access needs…)</label>
                      <input id={`m-${ev}`} className="input" maxLength={300} value={a.note} onChange={(e) => set({ note: e.target.value })} />
                    </div>
                  )}
                </fieldset>
              );
            })}
            {error && <p role="alert" className="rounded-2xl bg-rose-soft p-4 text-sm text-kumkum-dark">{error}</p>}
            <button type="submit" disabled={state === "saving"} className="btn btn-primary h-12 w-full text-base">{state === "saving" ? "Sending…" : "Send my response"}</button>
          </form>
        )}
      </main>
    </div>
  );
}
