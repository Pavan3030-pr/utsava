"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const EVENT_TYPES = [
  { id: "wedding", label: "Wedding", emoji: "💍" },
  { id: "birthday", label: "Birthday", emoji: "🎂" },
  { id: "community", label: "Community Event", emoji: "🤝" },
  { id: "engagement", label: "Engagement", emoji: "✨" },
  { id: "other", label: "Other Celebration", emoji: "🎉" },
];

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "wedding",
    title: "",
    date: "",
    guests: "",
    budget: "",
    location: "",
    style: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok && data.plan) {
        const id = "plan-" + Date.now();
        sessionStorage.setItem(`utsava-plan-${id}`, JSON.stringify(data.plan));
        router.push(`/dashboard/${id}`);
      } else {
        console.warn("AI unavailable, using demo plan", data);
        const mockId = "demo-" + Date.now();
        router.push(`/dashboard/${mockId}`);
      }
    } catch (err) {
      console.error(err);
      const mockId = "demo-" + Date.now();
      router.push(`/dashboard/${mockId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a73e8] to-[#0d47a1] flex items-center justify-center text-white font-bold text-sm">
            उ
          </div>
          <span className="font-semibold text-gray-900">Utsava</span>
        </Link>
        <span className="text-sm text-gray-500">Step {step} of 2</span>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            {step === 1 ? "What are we celebrating?" : "Tell us more"}
          </h1>
          <p className="mt-2 text-gray-600">
            {step === 1
              ? "Choose the type of event so Utsava can tailor the plan."
              : "A few details help the AI create a realistic, culturally aware plan."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.id })}
                  className={`card-premium p-5 text-left flex items-center gap-4 transition-all ${
                    form.type === t.id
                      ? "ring-2 ring-[#1a73e8] border-[#1a73e8]"
                      : "hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="font-medium text-gray-900">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Event title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Priya & Rahul Wedding"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Guest count</label>
                  <input
                    type="number"
                    value={form.guests}
                    onChange={(e) => setForm({ ...form, guests: e.target.value })}
                    placeholder="150"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget (₹)</label>
                  <input
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder="15,00,000"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Hyderabad"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Style / preferences</label>
                <input
                  value={form.style}
                  onChange={(e) => setForm({ ...form, style: e.target.value })}
                  placeholder="Traditional South Indian with modern sangeet"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Extra notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Any specific rituals, dietary needs, or must-haves..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-11 px-6 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-11 px-8 rounded-xl bg-[#1a73e8] text-white font-medium hover:bg-[#1557b0] shadow-sm"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="h-11 px-8 rounded-xl bg-[#1a73e8] text-white font-medium hover:bg-[#1557b0] shadow-sm disabled:opacity-70 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating plan...
                  </>
                ) : (
                  "Generate AI Plan"
                )}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
