import Link from "next/link";
import type { CSSProperties } from "react";
import { LogoMark, SiteHeader } from "@/components/Logo";

const tilt = (deg: string, delay = "0s") => ({ "--r": deg, animationDelay: delay }) as CSSProperties;

const EXAMPLES = [
  "200-guest Telugu wedding in Hyderabad, 25 lakhs, traditional with a modern sangeet",
  "Aarav's 5th birthday, dinosaur theme, 40 guests, Pune, 60k",
  "Ganesh Chaturthi for our 120-flat society in Mumbai",
];

const PIPELINE = [
  { n: "1", title: "Understand", body: "Gemini turns a sentence into a structured brief: type, date, guests, budget, city, language." },
  { n: "2", title: "Plan live", body: "Budget, schedule, timeline, vendors and themes stream onto your screen as they are written." },
  { n: "3", title: "Verify", body: "A deterministic checker reconciles every rupee so the budget always adds up — no LLM arithmetic." },
  { n: "4", title: "Refine", body: "Tell the copilot “cut 15%” or “add a vegan menu” and watch the whole plan adapt, progress preserved." },
];

const FEATURES = [
  { icon: "₹", title: "Budgets that add up", body: "Realistic INR splits for your city and guest count, with a saving tip on every line." },
  { icon: "🗓", title: "Real-dated timeline", body: "Milestones anchored to your date, exportable to Google or Apple Calendar in one click." },
  { icon: "🧾", title: "Vendor playbook", body: "Sharp questions to ask, honest price ranges and book-by deadlines for each vendor." },
  { icon: "🎨", title: "Mood-board themes", body: "Colour palettes and décor ideas per theme — rendered instantly, no image waiting." },
  { icon: "🗣", title: "9 Indian languages", body: "Plans and invitations in Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati." },
  { icon: "🛟", title: "Contingency built in", body: "Rain, vendor no-shows, overruns — each risk comes with a practical mitigation." },
];

export default function HomePage() {
  return (
    <div className="ambient">
      <SiteHeader />
      <main id="main">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="rangoli pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] spin-slow opacity-70" aria-hidden="true" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
            <div className="fade-up">
              <span className="chip"><span aria-hidden="true">✦</span> Powered by Gemini · Built for Indian celebrations</span>
              <h1 className="h-display mt-6 text-5xl font-semibold leading-[1.05] sm:text-6xl">
                Every celebration,<br />
                <span className="grad-text">planned in a sentence.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-soft">
                Tell Utsava what you’re celebrating. Watch a complete budget, timeline, vendor checklist and set of themes write themselves — then refine it by simply asking.
              </p>

              <form action="/create" method="get" className="surface mt-8 max-w-xl p-2.5">
                <label htmlFor="q" className="sr-only">Describe your celebration</label>
                <textarea
                  id="q" name="q" rows={2} maxLength={800} required minLength={5}
                  placeholder="e.g. 200-guest Telugu wedding in Hyderabad next December, 25 lakhs…"
                  className="w-full resize-none rounded-xl bg-transparent px-3 py-2 text-base outline-none placeholder:text-[#9a8b7c]"
                />
                <div className="flex items-center justify-between gap-3 px-1 pb-1">
                  <span className="text-xs text-soft">No sign-up needed</span>
                  <button type="submit" className="btn btn-primary">Plan it with AI →</button>
                </div>
              </form>

              <div className="mt-5 flex flex-wrap gap-2" aria-label="Try an example">
                {EXAMPLES.map((e) => (
                  <Link key={e} href={`/create?q=${encodeURIComponent(e)}`} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs text-soft transition hover:border-kumkum hover:text-kumkum">
                    {e.length > 46 ? e.slice(0, 44) + "…" : e}
                  </Link>
                ))}
              </div>
            </div>

            {/* floating illustrative preview */}
            <div className="relative mx-auto hidden h-[30rem] w-full max-w-md lg:block" aria-hidden="true">
              <div className="surface float absolute left-0 top-4 w-72 p-5" style={tilt("-3deg")}>
                <div className="text-xs font-semibold uppercase tracking-wider text-saffron-dark">Budget · ₹25 L</div>
                <div className="mt-4 flex items-center gap-4">
                  <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f6ead7" strokeWidth="6" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#b4234e" strokeWidth="6" strokeDasharray="30 88" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="6" strokeDasharray="24 88" strokeDashoffset="-30" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#0f766e" strokeWidth="6" strokeDasharray="14 88" strokeDashoffset="-54" />
                  </svg>
                  <ul className="space-y-1.5 text-xs text-soft">
                    <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-kumkum" />Venue</li>
                    <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-saffron" />Catering</li>
                    <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-leaf" />Décor</li>
                  </ul>
                </div>
              </div>
              <div className="surface float absolute right-0 top-40 w-64 p-5" style={tilt("3deg", "1s")}>
                <div className="text-xs font-semibold uppercase tracking-wider text-leaf">Timeline</div>
                <ol className="mt-3 space-y-2.5 text-sm">
                  {["D-90 · Book venue", "D-60 · Menu tasting", "D-30 · Send invites"].map((t, i) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-leaf" : "bg-line"}`} />{t}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="surface float absolute bottom-0 left-8 w-72 p-5" style={tilt("-1.5deg", "2s")}>
                <div className="text-xs font-semibold uppercase tracking-wider text-kumkum">AI Copilot</div>
                <p className="mt-2 rounded-xl bg-rose-soft px-3 py-2 text-sm">Cut the budget by 15% but keep the sangeet.</p>
                <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-sm">Done — saved ₹3.7 L on décor & photography.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PIPELINE */}
        <section className="border-y border-line bg-white/70 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="h-display text-center text-4xl font-semibold">Not a template. A planning engine.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-soft">Four stages, each doing something a static form can’t.</p>
            <ol className="mt-12 grid gap-5 md:grid-cols-4">
              {PIPELINE.map((s) => (
                <li key={s.n} className="surface surface-hover p-6">
                  <span className="h-display text-4xl font-semibold text-saffron">{s.n}</span>
                  <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-soft">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="h-display text-center text-4xl font-semibold">Everything for the big day</h2>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="surface surface-hover p-6">
                  <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-soft text-xl">{f.icon}</span>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-soft">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-20">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#c2410c] via-kumkum to-[#7c1d6f] px-8 py-14 text-center text-white">
            <div className="rangoli absolute inset-0 opacity-30" aria-hidden="true" />
            <h2 className="h-display relative text-4xl font-semibold">Your celebration deserves a plan.</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/90">Free. No account. Your plans stay private in your browser.</p>
            <Link href="/create" className="btn relative mt-8 bg-white text-kumkum-dark hover:bg-cream">Start planning →</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-soft sm:flex-row">
          <span className="flex items-center gap-2"><LogoMark size={26} /> Utsava (उत्सव) — festival, celebration</span>
          <span>AI-generated suggestions — always confirm prices with vendors.</span>
        </div>
      </footer>
    </div>
  );
}
