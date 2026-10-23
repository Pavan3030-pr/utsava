import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a73e8] to-[#0d47a1] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              उ
            </div>
            <span className="text-xl font-semibold tracking-tight text-gray-900">Utsava</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-[#1a73e8] transition-colors">Features</a>
            <a href="#how" className="hover:text-[#1a73e8] transition-colors">How it works</a>
            <a href="#culture" className="hover:text-[#1a73e8] transition-colors">Indian Roots</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#1a73e8] text-white text-sm font-medium shadow-sm hover:bg-[#1557b0] transition-colors">Get started free</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1a73e8] text-xs font-medium mb-6 border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-pulse" />
                GenAI-powered • Built for Indian celebrations
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-gray-900 leading-[1.15]">
                Plan every celebration<br /><span className="text-[#1a73e8]">with quiet intelligence</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
                From intimate birthdays to grand Indian weddings — Utsava turns your ideas into budgets, timelines, vendor checklists and personalized themes in minutes.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup" className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#1a73e8] text-white font-medium shadow-md hover:bg-[#1557b0] hover:shadow-lg transition-all">Start planning free</Link>
                <a href="#how" className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-full border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors">See how it works</a>
              </div>
              <p className="mt-6 text-sm text-gray-500">No credit card • Works for weddings, birthdays & community events</p>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Everything you need to celebrate beautifully</h2>
              <p className="mt-4 text-gray-600">One intelligent workspace for budgets, timelines, vendors and ideas — designed with the warmth of Indian traditions.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Smart Budget Builder", desc: "AI allocates realistic budgets in INR across venue, catering, decor, attire and more.", icon: "\u20b9" },
                { title: "Living Timeline", desc: "Day-by-day or week-by-week milestones with rituals, vendor deadlines and guest reminders.", icon: "\ud83d\udcc5" },
                { title: "Vendor Checklist", desc: "Category-wise actionable lists with cultural notes for pandit, mehendi, sangeet, caterer and more.", icon: "\u2713" },
                { title: "Personalized Themes", desc: "Mood boards and ideas that respect regional styles \u2014 South Indian, North Indian, fusion or modern.", icon: "\ud83c\udfa8" },
                { title: "Conversational AI", desc: "Chat to refine any part of the plan. Make the sangeet more traditional or reduce budget by 15%.", icon: "\ud83d\udcac" },
                { title: "Export & Share", desc: "Beautiful PDF plans and shareable links for family and vendors.", icon: "\ud83d\udcc4" },
              ].map((f) => (
                <div key={f.title} className="card-premium p-6 hover:-translate-y-0.5 transition-transform">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="py-20 bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">From idea to plan in three steps</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Describe your celebration", desc: "Tell Utsava the type of event, date, guest count, budget range and any cultural preferences." },
                { step: "02", title: "AI crafts your plan", desc: "Receive a complete budget, timeline, checklist and theme ideas tailored to Indian traditions." },
                { step: "03", title: "Refine & celebrate", desc: "Chat to adjust anything, export the PDF, share with family and execute with confidence." },
              ].map((s) => (
                <div key={s.step}>
                  <div className="text-5xl font-bold text-blue-100 mb-4">{s.step}</div>
                  <h3 className="text-xl font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-3 text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="culture" className="py-20 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Built with Indian celebrations in mind</h2>
                <p className="mt-4 text-gray-600 leading-relaxed">
                  Utsava understands the multi-day nature of Indian weddings, the importance of rituals, regional variations and the way families plan together.
                </p>
                <ul className="mt-6 space-y-3 text-gray-700">
                  <li className="flex items-start gap-3"><span className="mt-1 w-5 h-5 rounded-full bg-blue-100 text-[#1a73e8] flex items-center justify-center text-xs font-bold">\u2713</span> Multi-event wedding support</li>
                  <li className="flex items-start gap-3"><span className="mt-1 w-5 h-5 rounded-full bg-blue-100 text-[#1a73e8] flex items-center justify-center text-xs font-bold">\u2713</span> Regional styles & ritual awareness</li>
                  <li className="flex items-start gap-3"><span className="mt-1 w-5 h-5 rounded-full bg-blue-100 text-[#1a73e8] flex items-center justify-center text-xs font-bold">\u2713</span> Budgeting in INR with realistic ranges</li>
                </ul>
              </div>
              <div className="card-premium p-8 bg-gradient-to-br from-blue-50 to-white">
                <div className="text-sm font-medium text-[#1a73e8] mb-2">Sample prompt</div>
                <p className="text-gray-800 italic leading-relaxed">
                  \u201cPlan a 200-guest Telugu wedding in Hyderabad next December. Budget 25 lakhs. Traditional with modern sangeet.\u201d
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-[#1a73e8]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-semibold text-white tracking-tight">Ready to plan your next celebration?</h2>
            <p className="mt-4 text-blue-100">Join families and organizers who use Utsava to turn stress into joy.</p>
            <Link href="/signup" className="mt-8 inline-flex items-center justify-center h-12 px-8 rounded-full bg-white text-[#1a73e8] font-medium shadow-lg hover:bg-blue-50 transition-colors">Create your free account</Link>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1a73e8] to-[#0d47a1] flex items-center justify-center text-white text-sm font-bold">उ</div>
            <span className="font-semibold text-gray-900">Utsava</span>
          </div>
          <p className="text-sm text-gray-500">\u00a9 {new Date().getFullYear()} Utsava. Built with care for Indian celebrations.</p>
        </div>
      </footer>
    </div>
  );
}
