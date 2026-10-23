"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "budget", label: "Budget" },
  { id: "timeline", label: "Timeline" },
  { id: "checklist", label: "Checklist" },
  { id: "ideas", label: "Ideas" },
  { id: "chat", label: "Chat" },
];

const DEMO = {
  title: "Priya & Rahul Wedding",
  summary: "A beautiful traditional Telugu wedding with modern touches in Hyderabad.",
  themes: ["Traditional Telugu with modern elegance", "Marigold & ivory floral theme", "Fusion sangeet night"],
  budget: {
    total: 2200000,
    currency: "INR",
    breakdown: [
      { category: "Venue & D\u00e9cor", amount: 650000, percentage: 30 },
      { category: "Catering", amount: 550000, percentage: 25 },
      { category: "Photography & Video", amount: 220000, percentage: 10 },
      { category: "Attire & Jewellery", amount: 350000, percentage: 16 },
      { category: "Entertainment & Sangeet", amount: 180000, percentage: 8 },
      { category: "Invitations & Misc", amount: 150000, percentage: 7 },
      { category: "Contingency", amount: 100000, percentage: 4 },
    ],
  },
  timeline: [
    { phase: "D-90", title: "Book venue & pandit" },
    { phase: "D-60", title: "Finalize caterer & menu tasting" },
    { phase: "D-45", title: "Send invitations" },
    { phase: "D-30", title: "Mehendi & Sangeet planning" },
    { phase: "D-7", title: "Final guest count & seating" },
    { phase: "D-1", title: "Rehearsal & d\u00e9cor setup" },
    { phase: "Day 0", title: "Wedding ceremonies" },
  ],
  checklist: [
    { category: "Rituals", items: [{ task: "Book pandit" }, { task: "Arrange havan materials" }, { task: "Confirm muhurat" }] },
    { category: "Vendors", items: [{ task: "Venue deposit" }, { task: "Caterer contract" }, { task: "Photographer booking" }] },
    { category: "Guest Experience", items: [{ task: "Accommodation list" }, { task: "Transport plan" }, { task: "Return gifts" }] },
  ],
  culturalNotes: [
    "Include traditional Telugu rituals such as Jeelakarra Bellam and Sthaalipaakam.",
    "Allocate time for both bride and groom side family gatherings.",
  ],
};

type Plan = typeof DEMO;

export default function DashboardPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [plan, setPlan] = useState<Plan>(DEMO);
  const [isDemo, setIsDemo] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Namaste! I've prepared a complete plan for your celebration. Explore the tabs or ask me to adjust anything." },
  ]);

  useEffect(() => {
    const id = params.id as string;
    if (id?.startsWith("plan-")) {
      try {
        const stored = sessionStorage.getItem(`utsava-plan-${id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPlan(parsed);
          setIsDemo(false);
          setMessages([{ role: "assistant", content: `Namaste! Your personalized plan for "${parsed.title}" is ready.` }]);
        }
      } catch {}
    }
  }, [params.id]);

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages((m) => [...m, { role: "user", content: chatInput }]);
    setChatInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: "Understood. Add your OPENAI_API_KEY on Vercel to enable real refinements." }]);
    }, 800);
  };

  const formatINR = (n: number) => {
    if (n >= 100000) return `\u20b9${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `\u20b9${(n / 1000).toFixed(0)}k`;
    return `\u20b9${n}`;
  };

  return (
    <div className="min-h-screen flex bg-[#fafafa]">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a73e8] to-[#0d47a1] flex items-center justify-center text-white font-bold text-sm">\u0909</div>
            <span className="font-semibold text-gray-900">Utsava</span>
          </Link>
        </div>
        <div className="p-4 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Current Event {isDemo && "(Demo)"}</div>
          <div className="font-medium text-gray-900 truncate">{plan.title}</div>
          <div className="text-sm text-gray-500 mt-0.5">{formatINR(plan.budget?.total || 0)} budget</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-blue-50 text-[#1a73e8]" : "text-gray-600 hover:bg-gray-50"
              }`}>{tab.label}</button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <Link href="/create" className="block w-full text-center h-10 leading-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">+ New Event</Link>
          <Link href="/" className="block w-full text-center text-xs text-gray-500 hover:text-gray-700">\u2190 Back to home</Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6">
          <div className="md:hidden">
            <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)} className="text-sm font-medium border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
              {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="hidden md:block text-sm text-gray-500 truncate max-w-xs">{plan.title}</div>
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 md:px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => alert("PDF export coming soon")}>Export PDF</button>
            <button className="h-9 px-3 md:px-4 rounded-lg bg-[#1a73e8] text-white text-sm font-medium hover:bg-[#1557b0]">Share</button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {activeTab === "overview" && (
            <div className="max-w-4xl space-y-6">
              <div className="card-premium p-6">
                <h2 className="text-xl font-semibold text-gray-900">{plan.title}</h2>
                <p className="mt-2 text-gray-600">{plan.summary}</p>
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4"><div className="text-sm text-gray-600">Total Budget</div><div className="text-xl font-semibold mt-1">{formatINR(plan.budget?.total || 0)}</div></div>
                  <div className="bg-green-50 rounded-xl p-4"><div className="text-sm text-gray-600">Themes</div><div className="text-xl font-semibold mt-1">{plan.themes?.length || 0}</div></div>
                  <div className="bg-amber-50 rounded-xl p-4"><div className="text-sm text-gray-600">Timeline steps</div><div className="text-xl font-semibold mt-1">{plan.timeline?.length || 0}</div></div>
                </div>
              </div>
              {plan.themes?.length > 0 && (
                <div className="card-premium p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Recommended Themes</h3>
                  <div className="flex flex-wrap gap-2">{plan.themes.map((t: string) => <span key={t} className="px-3 py-1.5 rounded-full bg-blue-50 text-[#1a73e8] text-sm font-medium">{t}</span>)}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === "budget" && (
            <div className="max-w-3xl">
              <div className="card-premium p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Budget Breakdown</h2>
                  <span className="text-2xl font-semibold">{formatINR(plan.budget?.total || 0)}</span>
                </div>
                <div className="space-y-4">
                  {(plan.budget?.breakdown || []).map((b: any) => (
                    <div key={b.category}>
                      <div className="flex justify-between text-sm mb-1.5"><span className="font-medium">{b.category}</span><span>{formatINR(b.amount)} \u00b7 {b.percentage}%</span></div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#1a73e8] rounded-full" style={{ width: `${Math.min(b.percentage, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="max-w-2xl">
              <div className="card-premium p-6">
                <h2 className="text-xl font-semibold mb-6">Timeline</h2>
                <div className="space-y-0">
                  {(plan.timeline || []).map((t: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-[#1a73e8] ring-4 ring-blue-50" />
                        {i < (plan.timeline?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
                      </div>
                      <div className="pb-8">
                        <div className="text-xs font-medium text-[#1a73e8]">{t.phase}</div>
                        <div className="font-medium text-gray-900 mt-0.5">{t.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "checklist" && (
            <div className="max-w-4xl grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(plan.checklist || []).map((c: any) => (
                <div key={c.category} className="card-premium p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">{c.category}</h3>
                  <ul className="space-y-3">
                    {(c.items || []).map((item: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <input type="checkbox" className="mt-1 rounded border-gray-300 text-[#1a73e8]" />
                        <span className="text-sm text-gray-700">{typeof item === "string" ? item : item.task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {activeTab === "ideas" && (
            <div className="max-w-4xl">
              <div className="card-premium p-6">
                <h2 className="text-xl font-semibold mb-2">Theme & Ideas</h2>
                <p className="text-gray-600 mb-6">AI-generated directions. Mood-board images will appear once DALL\u00b7E is wired.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(plan.themes || []).map((t: string, i: number) => (
                    <div key={i} className="aspect-[4/3] rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 flex items-end p-4">
                      <span className="text-sm font-medium text-gray-800">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="max-w-2xl h-[calc(100vh-10rem)] flex flex-col">
              <div className="card-premium flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-[#1a73e8] text-white" : "bg-gray-100 text-gray-800"}`}>{m.content}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleChat} className="p-4 border-t border-gray-100 flex gap-2">
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask to adjust budget, add rituals..." className="flex-1 h-11 px-4 rounded-xl border border-gray-200 focus:border-[#1a73e8] outline-none text-sm" />
                  <button type="submit" className="h-11 px-5 rounded-xl bg-[#1a73e8] text-white font-medium text-sm hover:bg-[#1557b0]">Send</button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
