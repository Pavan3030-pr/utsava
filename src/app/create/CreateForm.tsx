"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatINRFull, parseINR } from "@/lib/format";
import { EVENT_TYPES, EVENT_TYPE_META, IntakeSchema, LANGUAGES, type EventType, type LanguageCode } from "@/lib/schemas";
import { createEvent } from "@/lib/storage";

interface FormState {
  type: EventType; title: string; date: string; guests: string; budget: string;
  location: string; style: string; notes: string; language: LanguageCode;
}

const EMPTY: FormState = {
  type: "wedding", title: "", date: "", guests: "", budget: "", location: "", style: "", notes: "", language: "en",
};

export function CreateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [magic, setMagic] = useState(params.get("q") ?? "");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [parsing, setParsing] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [filled, setFilled] = useState(false);
  const autoRan = useRef(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const understand = useCallback(async (text: string) => {
    if (text.trim().length < 5) return;
    setParsing(true);
    setStatus("Reading your idea…");
    try {
      const res = await fetch("/api/plan/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong");
      const i = data.intake ?? {};
      setForm((f) => ({
        ...f,
        type: i.type ?? f.type,
        title: i.title ?? f.title,
        date: i.date ?? f.date,
        guests: i.guests ? String(i.guests) : f.guests,
        budget: i.budget ? String(i.budget) : f.budget,
        location: i.location ?? f.location,
        style: i.style ?? f.style,
        notes: i.notes ?? f.notes,
        language: i.language ?? f.language,
      }));
      setFilled(true);
      setStatus("Got it — I filled in the details below. Tweak anything, then generate.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't understand that — please use the form.");
    } finally {
      setParsing(false);
    }
  }, []);

  // Arriving from the landing page with ?q=… → parse immediately (once).
  useEffect(() => {
    if (autoRan.current || !params.get("q")) return;
    autoRan.current = true;
    void understand(params.get("q") ?? "");
  }, [params, understand]);

  const budgetNumber = parseINR(form.budget);
  const budgetInvalid = form.budget.trim() !== "" && budgetNumber === undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = {
      type: form.type,
      title: form.title,
      date: form.date || undefined,
      guests: form.guests ? Number(form.guests) : undefined,
      budget: budgetNumber,
      location: form.location || undefined,
      style: form.style || undefined,
      notes: form.notes || undefined,
      language: form.language,
    };
    const result = IntakeSchema.safeParse(candidate);
    if (!result.success || budgetInvalid) {
      const msgs = result.success ? [] : result.error.issues.map((i) => `${i.path.join(".") || "form"}: ${i.message}`);
      if (budgetInvalid) msgs.push("budget: try a number like 1500000, 15L or 1.5 crore");
      setErrors(msgs);
      return;
    }
    setErrors([]);
    const event = createEvent(result.data);
    router.push(`/plan/${event.id}`);
  };

  return (
    <div className="fade-up">
      <h1 className="h-display text-4xl font-semibold">What are we <span className="grad-text">celebrating?</span></h1>
      <p className="mt-2 text-soft">Describe it in your own words — or fill in the details yourself.</p>

      {/* Magic intake */}
      <section aria-labelledby="magic-h" className="surface mt-8 p-5">
        <h2 id="magic-h" className="flex items-center gap-2 text-sm font-semibold text-kumkum">
          <span aria-hidden="true">✦</span> Just tell Utsava
        </h2>
        <label htmlFor="magic" className="sr-only">Describe your celebration</label>
        <textarea
          id="magic" rows={3} maxLength={800} value={magic} onChange={(e) => setMagic(e.target.value)}
          placeholder="e.g. Sangeet + wedding for 250 guests in Jaipur in February, around 40 lakhs, Rajasthani style, Hindi please"
          className="input mt-3 resize-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="text-sm text-soft">{status}</p>
          <button type="button" onClick={() => understand(magic)} disabled={parsing || magic.trim().length < 5} className="btn btn-ghost btn-sm shrink-0">
            {parsing ? "Reading…" : "Fill the form for me"}
          </button>
        </div>
      </section>

      <form onSubmit={submit} noValidate className="mt-6 space-y-6" aria-label="Event details">
        <fieldset>
          <legend className="field-label">Type of celebration</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {EVENT_TYPES.map((t) => (
              <label key={t} className="surface surface-hover flex cursor-pointer items-start gap-3 p-4 has-[:checked]:border-kumkum has-[:checked]:bg-rose-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2">
                <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => set("type", t)} className="sr-only" />
                <span aria-hidden="true" className="text-2xl">{EVENT_TYPE_META[t].emoji}</span>
                <span>
                  <span className="block text-sm font-semibold">{EVENT_TYPE_META[t].label}</span>
                  <span className="block text-xs text-soft">{EVENT_TYPE_META[t].hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={`surface space-y-5 p-6 transition ${filled ? "ring-2 ring-saffron/50" : ""}`}>
          <div>
            <label htmlFor="title" className="field-label">Event name *</label>
            <input id="title" required maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Priya & Rahul’s Wedding" className="input" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="field-label">Date</label>
              <input id="date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="guests" className="field-label">Guests</label>
              <input id="guests" type="number" inputMode="numeric" min={1} max={10000} value={form.guests} onChange={(e) => set("guests", e.target.value)} placeholder="150" className="input" />
            </div>
            <div>
              <label htmlFor="budget" className="field-label">Budget (₹)</label>
              <input id="budget" inputMode="text" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="15,00,000 or 15L" aria-describedby="budget-hint" aria-invalid={budgetInvalid} className="input" />
              <p id="budget-hint" className={`field-hint ${budgetInvalid ? "!text-kumkum" : ""}`}>
                {budgetInvalid ? "Try 1500000, 15L or 1.5 crore" : budgetNumber ? `= ${formatINRFull(budgetNumber)}` : "Leave empty and AI will suggest one"}
              </p>
            </div>
            <div>
              <label htmlFor="location" className="field-label">City</label>
              <input id="location" maxLength={80} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Hyderabad" className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="style" className="field-label">Style & traditions</label>
            <input id="style" maxLength={200} value={form.style} onChange={(e) => set("style", e.target.value)} placeholder="Traditional Telugu with a modern sangeet" className="input" />
          </div>
          <div>
            <label htmlFor="notes" className="field-label">Anything else?</label>
            <textarea id="notes" rows={3} maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Vegetarian-only, wheelchair access for grandparents, outdoor preferred…" className="input resize-none" />
          </div>
          <div>
            <label htmlFor="language" className="field-label">Plan language</label>
            <select id="language" value={form.language} onChange={(e) => set("language", e.target.value as LanguageCode)} className="input">
              {(Object.entries(LANGUAGES) as [LanguageCode, string][]).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {errors.length > 0 && (
          <div role="alert" className="rounded-2xl border border-kumkum/30 bg-rose-soft p-4 text-sm text-kumkum-dark">
            <p className="font-semibold">Please fix:</p>
            <ul className="mt-1 list-disc pl-5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary h-12 px-8 text-base">Generate my plan ✦</button>
        </div>
      </form>
    </div>
  );
}
