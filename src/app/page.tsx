import Link from "next/link";
import { LogoMark, SiteHeader } from "@/components/Logo";

const EXAMPLES = [
  "200-guest Telugu wedding in Hyderabad, 25 lakhs, traditional with a modern sangeet",
  "Aarav’s 5th birthday, dinosaur theme, 40 guests, Pune, 60k",
  "Ganesh Chaturthi for our 120-flat society in Mumbai",
];

const STATS = [
  { v: "4", l: "AI planners writing in parallel" },
  { v: "9", l: "Indian languages" },
  { v: "62", l: "automated tests" },
  { v: "0", l: "sign-ups to start" },
];

const STEPS = [
  { n: "01", t: "Say it in a sentence", b: "Gemini turns free text into a structured brief — type, date, guests, budget, city, language." },
  { n: "02", t: "Watch it write live", b: "Four planners stream budget, schedule, checklist and themes at the same time." },
  { n: "03", t: "Numbers you can trust", b: "Code, not the model, reconciles every rupee so the budget always adds up." },
  { n: "04", t: "Run the celebration", b: "Invite guests per event, collect RSVPs, track payments — and ask the copilot to adapt." },
];

const MATRIX = [
  { who: "Anita Reddy", cells: ["yes", "yes", "yes"] },
  { who: "Ravi Kumar", cells: ["no", "yes", "maybe"] },
  { who: "Priya Nair", cells: ["", "yes", "yes"] },
];
const CELL: Record<string, string> = { yes: "bg-leaf text-white", no: "bg-kumkum text-white", maybe: "bg-saffron text-white", "": "bg-[#f3ece2] text-soft" };
const CELL_LABEL: Record<string, string> = { yes: "✓", no: "✕", maybe: "?", "": "–" };

const COMPARE = [
  ["Different guests for mehendi, sangeet, wedding", false, true],
  ["A personal RSVP link & WhatsApp message per guest", false, true],
  ["Plans and invitations in 9 Indian languages", false, true],
  ["Budget maths verified by code, not guessed", false, true],
  ["Ask AI to “cut 15%” and the plan rewrites itself", false, true],
  ["Planned-vs-actual spend with overspend alerts", true, true],
] as const;

/** Marigold torana — pure SVG, decorative. */
function Garland() {
  const n = 24;
  const seg = 52;
  const path = Array.from({ length: n }, (_, i) => `Q${i * seg + seg / 2} 38 ${(i + 1) * seg} 8`).join(" ");
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${n * seg} 64`} preserveAspectRatio="xMidYMin slice" className="pointer-events-none block h-14 w-full">
      <path d={`M0 8 ${path}`} fill="none" stroke="#b45309" strokeOpacity=".45" strokeWidth="1.5" />
      {Array.from({ length: n + 1 }, (_, i) => (
        <g key={i} transform={`translate(${i * seg} 8)`}>
          <circle r="9" fill={i % 2 ? "#f59e0b" : "#ea580c"} />
          <circle r="4.2" fill="#fde68a" />
        </g>
      ))}
      {Array.from({ length: n }, (_, i) => (
        <g key={`p${i}`} transform={`translate(${i * seg + seg / 2} 22)`}>
          <path d="M0 0 C-5 6 -5 12 0 17 C5 12 5 6 0 0Z" fill={i % 2 ? "#b4234e" : "#0f766e"} fillOpacity=".9" />
        </g>
      ))}
    </svg>
  );
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="section-head reveal">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="h-display t-h2 mt-3">{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="ambient">
      <SiteHeader />
      <main id="main">
        {/* ───────── HERO ───────── */}
        <section className="relative overflow-hidden">
          <Garland />
          <div className="rangoli pointer-events-none absolute -right-28 top-10 h-[30rem] w-[30rem] spin-slow opacity-60" aria-hidden="true" />
          <div className="container-x relative grid items-center gap-14 pb-20 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-16">
            <div className="fade-up">
              <span className="chip"><span aria-hidden="true">✦</span> Powered by Gemini · Built for Indian celebrations</span>
              <h1 className="h-display t-hero mt-6">
                Every celebration,<br /><span className="grad-text">planned in a sentence.</span>
              </h1>
              <p className="lead mt-6 max-w-xl">
                Tell Utsava what you’re celebrating. A complete budget, timeline, vendor checklist and set of themes write themselves in seconds — then invite every guest, collect RSVPs and track every rupee.
              </p>

              <form action="/create" method="get" className="surface mt-9 max-w-xl p-3">
                <input type="hidden" name="go" value="1" />
                <label htmlFor="q" className="sr-only">Describe your celebration</label>
                <textarea id="q" name="q" rows={2} maxLength={800} required minLength={5}
                  placeholder="e.g. 200-guest Telugu wedding in Hyderabad next December, 25 lakhs…"
                  className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-[#9a8b7c]" />
                <div className="flex items-center justify-between gap-3 px-1 pt-1">
                  <span className="text-xs text-soft">Free · no sign-up</span>
                  <button type="submit" className="btn btn-primary">Plan it with AI →</button>
                </div>
              </form>

              <div className="mt-6 flex flex-wrap gap-2.5" role="group" aria-label="Try an example">
                {EXAMPLES.map((e) => (
                  <Link key={e} href={`/create?q=${encodeURIComponent(e)}&go=1`}
                    className="rounded-full border border-line bg-white px-4 py-2 text-xs text-soft transition hover:border-kumkum hover:text-kumkum">
                    {e.length > 44 ? e.slice(0, 42) + "…" : e}
                  </Link>
                ))}
              </div>
            </div>

            {/* product preview: normal flow, no absolute positioning → never overlaps */}
            <div className="fade-up relative" style={{ animationDelay: ".15s" }} aria-hidden="true">
              <div className="surface overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line bg-cream/60 px-5 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f0b8b8]" /><span className="h-2.5 w-2.5 rounded-full bg-[#f3d9a0]" /><span className="h-2.5 w-2.5 rounded-full bg-[#b9dccb]" />
                  <span className="ml-3 text-xs font-semibold text-soft">Priya & Rahul · 14 Feb 2027</span>
                  <span className="ml-auto rounded-full bg-leaf-soft px-2.5 py-0.5 text-[10px] font-bold text-leaf">✓ Budget verified</span>
                </div>
                <div className="grid gap-5 p-5 sm:grid-cols-2">
                  <div className="rounded-2xl bg-rose-soft/60 p-4">
                    <p className="eyebrow !text-kumkum-dark">Budget · ₹25 L</p>
                    <div className="mt-3 flex items-center gap-4">
                      <svg viewBox="0 0 42 42" className="h-20 w-20 shrink-0 -rotate-90">
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f6ead7" strokeWidth="6" />
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#b4234e" strokeWidth="6" pathLength="100" strokeDasharray="38 62" />
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="6" pathLength="100" strokeDasharray="30 70" strokeDashoffset="-38" />
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#0f766e" strokeWidth="6" pathLength="100" strokeDasharray="18 82" strokeDashoffset="-68" />
                      </svg>
                      <ul className="space-y-1.5 text-xs text-soft">
                        <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-kumkum" />Venue 38%</li>
                        <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-saffron" />Catering 30%</li>
                        <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-leaf" />Décor 18%</li>
                      </ul>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-leaf-soft/70 p-4">
                    <p className="eyebrow !text-leaf">Timeline</p>
                    <ol className="mt-3 space-y-2.5 text-sm">
                      {["D-90 · Book venue", "D-60 · Menu tasting", "D-30 · Send invites"].map((t, i) => (
                        <li key={t} className="flex items-center gap-2.5"><span className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-leaf" : "bg-[#cfe3de]"}`} />{t}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="space-y-2 rounded-2xl bg-cream/80 p-4 sm:col-span-2">
                    <p className="eyebrow">AI Copilot</p>
                    <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-kumkum px-3.5 py-2 text-sm text-white">Cut the budget by 15% but keep the sangeet.</p>
                    <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm">Done — saved ₹3.7 L on décor and photography.</p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-soft">Illustrative preview</p>
            </div>
          </div>
        </section>

        {/* ───────── STATS ───────── */}
        <section className="container-x -mt-4 pb-4">
          <dl className="surface grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
            {STATS.map((s) => (
              <div key={s.l} className="flex flex-col-reverse px-6 py-6 text-center">
                <dt className="mt-1 text-xs text-soft">{s.l}</dt>
                <dd className="h-display text-4xl font-semibold grad-text">{s.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ───────── HOW IT WORKS ───────── */}
        <section className="section-y">
          <div className="container-x">
            <SectionHead eyebrow="How it works" title="Not a template. A planning engine." lead="Four stages, each doing something a static form can’t." />
            <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.n} className="surface surface-hover reveal p-7">
                  <span className="h-display text-4xl font-semibold text-saffron">{s.n}</span>
                  <h3 className="mt-4 text-lg font-semibold leading-snug">{s.t}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-soft">{s.b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ───────── BENTO ───────── */}
        <section className="section-y border-y border-line bg-white/70">
          <div className="container-x">
            <SectionHead eyebrow="Everything in one place" title="Plan it. Invite them. Track it." lead="Built for celebrations with many events and many guest lists." />
            <ul className="mt-14 grid gap-6 lg:grid-cols-3">
              <li className="surface surface-hover reveal p-7 lg:col-span-2">
                <p className="eyebrow">Multi-event guest lists</p>
                <h3 className="h-display mt-2 text-2xl font-semibold">Mehendi, sangeet, wedding — different guests at each.</h3>
                <p className="mt-2 max-w-lg text-sm text-soft">Invite every guest to exactly the events they belong to, and see confirmed headcount per event.</p>
                <div className="mt-6 overflow-x-auto" aria-hidden="true">
                  <table className="w-full min-w-[22rem] text-left text-xs">
                    <thead><tr className="text-soft"><th className="py-2 pr-3 font-semibold">Guest</th><th className="px-2 text-center font-semibold">Mehendi</th><th className="px-2 text-center font-semibold">Sangeet</th><th className="px-2 text-center font-semibold">Wedding</th></tr></thead>
                    <tbody>
                      {MATRIX.map((r) => (
                        <tr key={r.who} className="border-t border-line">
                          <td className="py-2.5 pr-3 font-semibold">{r.who}</td>
                          {r.cells.map((c, i) => <td key={i} className="px-2 py-2.5 text-center"><span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${CELL[c]}`}>{CELL_LABEL[c]}</span></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </li>
              {[
                { i: "⚡", t: "Plans in seconds", b: "Four Gemini calls run at once and stream live — the first section appears in about a second." },
                { i: "💌", t: "Personal RSVP links", b: "Every guest gets their own invitation page and WhatsApp message. Replies land in your dashboard." },
              ].map((f) => (
                <li key={f.t} className="surface surface-hover reveal p-7">
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-xl">{f.i}</span>
                  <h3 className="mt-5 text-lg font-semibold">{f.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-soft">{f.b}</p>
                </li>
              ))}
              {[
                { i: "▤", t: "Spend tracker", b: "Log quotes and payments against the plan. See overspend, balances and due dates before they bite.", span: "lg:col-span-2" },
                { i: "✦", t: "Vendor pipeline", b: "Shortlist → quote → booked, with sharp questions and book-by dates for every category.", span: "" },
                { i: "🗣", t: "9 Indian languages", b: "Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati and English — set in matched fonts.", span: "" },
                { i: "✧", t: "AI Copilot", b: "“Plan for rain.” “Add a vegan menu.” Only the affected sections are rewritten — and your ticks stay.", span: "" },
              ].map((f) => (
                <li key={f.t} className={`surface surface-hover reveal p-7 ${f.span}`}>
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-xl">{f.i}</span>
                  <h3 className="mt-5 text-lg font-semibold">{f.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-soft">{f.b}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ───────── COMPARE ───────── */}
        <section className="section-y">
          <div className="container-x max-w-4xl">
            <SectionHead eyebrow="Why Utsava" title="Built around how Indian celebrations really work." />
            <div className="surface reveal mt-12 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="sr-only">Feature comparison between typical planner apps and Utsava</caption>
                <thead>
                  <tr className="border-b border-line bg-cream/60 text-xs uppercase tracking-wide text-soft">
                    <th scope="col" className="px-6 py-4 font-semibold">Capability</th>
                    <th scope="col" className="px-4 py-4 text-center font-semibold">Typical planner apps</th>
                    <th scope="col" className="px-4 py-4 text-center font-semibold text-kumkum">Utsava</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {COMPARE.map(([label, them, us]) => (
                    <tr key={label}>
                      <th scope="row" className="px-6 py-4 font-medium">{label}</th>
                      <td className="px-4 py-4 text-center">{them ? <><span aria-hidden="true" className="font-bold text-leaf">✓</span><span className="sr-only">Yes</span></> : <><span aria-hidden="true" className="text-soft">—</span><span className="sr-only">Usually not</span></>}</td>
                      <td className="px-4 py-4 text-center">{us ? <><span aria-hidden="true" className="font-bold text-leaf">✓</span><span className="sr-only">Yes</span></> : <span aria-hidden="true">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ───────── CTA ───────── */}
        <section className="container-x pb-24">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#c2410c] via-kumkum to-[#7c1d6f] px-8 py-16 text-center text-white sm:px-16">
            <div className="rangoli absolute inset-0 opacity-30" aria-hidden="true" />
            <h2 className="h-display t-h2 relative">Your celebration deserves a plan.</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-white/90">Free to start. No account needed. Your plan is ready before your chai cools.</p>
            <Link href="/create" className="btn relative mt-9 h-12 bg-white px-8 text-base text-kumkum-dark hover:bg-cream">Start planning →</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-10">
        <div className="container-x flex flex-col items-center justify-between gap-4 text-sm text-soft sm:flex-row">
          <span className="flex items-center gap-2.5"><LogoMark size={28} /> Utsava (उत्सव) — festival, celebration</span>
          <span>AI-generated suggestions — always confirm prices with vendors.</span>
        </div>
      </footer>
    </div>
  );
}
