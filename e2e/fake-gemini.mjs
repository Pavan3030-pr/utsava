// Fake Gemini API for end-to-end testing: valid structured output, streaming, and injectable failures.
import http from "node:http";

const state = { failNext: 0, mode: "503", delayMs: 15, counts: {}, log: [] };

const base = () => ({
  title: "Mumbai Community Utsav",
  tagline: "Neighbours, music and shared joy",
  summary: "A balanced traditional and modern community event for 120 guests in Mumbai with realistic pricing.",
  themes: [
    { name: "Marigold Morning", description: "Warm festive colours", palette: ["#F59E0B", "#B4234E", "#0F766E"], decor: ["Marigold garlands", "Brass diyas", "Rangoli entrance"] },
    { name: "marigold morning", description: "Duplicate theme", palette: ["#f59e0b"], decor: ["garlands"] },
  ],
  budget: { total: 1000000, breakdown: [
    { category: "Venue", amount: 350000, percentage: 35, notes: "Hall + power", savingTip: "Weekday slot" },
    { category: "Catering", amount: 300000, percentage: 30, notes: "Lunch for 120", savingTip: "Fixed menu" },
    { category: "Decor", amount: 150000, percentage: 15, notes: "Florals", savingTip: "Reuse" },
    { category: "venue", amount: 0, percentage: 0, notes: "dupe line", savingTip: "" },
    { category: "Entertainment", amount: 120000, percentage: 12, notes: "Band", savingTip: "Local artists" },
    { category: "Contingency", amount: 80000, percentage: 8, notes: "Buffer", savingTip: "" },
  ] },
  schedule: [
    { day: "Event day", name: "Opening Pooja", vibe: "Sacred", items: [{ time: "9:00 AM", activity: "Welcome" }, { time: "9:00 AM", activity: "welcome" }, { time: "10:00 AM", activity: "Pooja" }] },
    { day: "Event day", name: "Community Lunch", vibe: "Warm", items: [{ time: "1:00 PM", activity: "Lunch" }] },
  ],
  timeline: [
    { daysBefore: 60, title: "Book venue", description: "Pay deposit" },
    { daysBefore: 60, title: "book venue", description: "" },
    { daysBefore: 30, title: "Finalise menu", description: "Tasting" },
    { daysBefore: 0, title: "Event day", description: "Enjoy" },
  ],
  checklist: [
    { category: "Vendors", items: [{ task: "Book caterer", priority: "high", completed: false }, { task: "Book decorator", priority: "medium", completed: false }] },
    { category: "vendors", items: [{ task: "book caterer", priority: "low", completed: false }] },
    { category: "Logistics", items: [{ task: "Arrange parking", priority: "medium", completed: false }, { task: "Book caterer", priority: "high", completed: false }] },
  ],
  vendors: [
    { category: "Catering", whatToLookFor: "Hygiene", questionsToAsk: ["Tasting available?", "Staff count?"], estimatedRange: "₹600-900/plate", bookBy: "2 months before" },
    { category: "catering", whatToLookFor: "", questionsToAsk: ["Tasting available?"], estimatedRange: "", bookBy: "" },
    { category: "Photography", whatToLookFor: "Candid style", questionsToAsk: ["Delivery time?"], estimatedRange: "₹40-60k", bookBy: "6 weeks before" },
  ],
  culturalNotes: ["Offer coconut at the entrance", "offer coconut at the entrance!", "Remove footwear near the pooja area"],
  risks: [{ risk: "Monsoon showers", mitigation: "Covered backup" }, { risk: "monsoon showers", mitigation: "" }],
  invitation: { language: "English", message: "Namaste [Guest name], join us for our community utsav." },
});

const PARTS = {
  core: ["title", "tagline", "summary", "budget"], schedule: ["schedule", "timeline"],
  ops: ["checklist", "vendors"], ideas: ["themes", "culturalNotes", "risks", "invitation"],
};
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]));

function detect(body) {
  const props = Object.keys(body?.generationConfig?.responseSchema?.properties ?? {});
  if (props.includes("reply")) return "refine";
  for (const [part, keys] of Object.entries(PARTS)) if (keys.every((k) => props.includes(k))) return part;
  return "parse";
}

function refine(text) {
  const parts = /EDITABLE PARTS: ([a-z, ]+)/.exec(text)?.[1]?.split(",").map((s) => s.trim()) ?? [];
  const instr = (/<user_input>\s*([\s\S]*?)\s*<\/user_input>/.exec(text)?.[1] ?? "").toLowerCase();
  const b = base();
  const updates = {};
  const pct = /(\d+)\s?%/.exec(instr)?.[1];
  const changes = [];
  if (parts.includes("core")) {
    const f = pct ? 1 - Number(pct) / 100 : 1;
    const breakdown = b.budget.breakdown.filter((x) => x.category !== "venue").map((x) => ({ ...x, amount: Math.round(x.amount * f / 1000) * 1000 }));
    updates.core = { title: b.title, tagline: b.tagline, summary: b.summary, budget: { total: breakdown.reduce((s, x) => s + x.amount, 0), breakdown } };
    changes.push(pct ? `Budget reduced by ${pct}%` : "Summary refreshed");
  }
  if (parts.includes("ops")) {
    updates.ops = { checklist: [...b.checklist, { category: "Eco", items: [{ task: "Arrange eco bins", priority: "medium", completed: false }, { task: "Book the caterer", priority: "high", completed: false }] }], vendors: b.vendors };
    changes.push("Added eco tasks");
  }
  if (parts.includes("ideas")) {
    updates.ideas = { themes: [...b.themes, { name: "Eco-Chic", description: "Sustainable", palette: ["#0F766E", "#F59E0B"], decor: ["Banana leaves"] }], culturalNotes: b.culturalNotes, risks: b.risks, invitation: b.invitation };
    changes.push("Added an Eco-Chic theme");
  }
  if (parts.includes("schedule")) {
    updates.schedule = { schedule: b.schedule, timeline: b.timeline };
    changes.push("Adjusted the schedule");
  }
  return { reply: pct ? `Done — I trimmed the budget by ${pct}%.` : "Done — I updated your plan.", changes, updates };
}

function payload(kind, bodyText) {
  if (kind === "refine") return refine(bodyText);
  if (kind === "parse") return { type: "community", title: "Mumbai Community Utsav", guests: 120, budget: 1000000, location: "Mumbai" };
  return pick(base(), PARTS[kind]);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__ctl") { let d = ""; for await (const c of req) d += c; const o = JSON.parse(d || "{}"); if (o.reset) { state.counts = {}; state.log = []; state.failNext = 0; state.mode = "503"; delete o.reset; } Object.assign(state, o); res.end(JSON.stringify(state)); return; }
  if (url.pathname === "/__stats") { res.end(JSON.stringify({ counts: state.counts, log: state.log })); return; }
  let raw = ""; for await (const c of req) raw += c;
  let body = {}; try { body = JSON.parse(raw); } catch { /* ignore */ }
  const stream = url.pathname.includes("streamGenerateContent");
  const kind = detect(body);
  state.counts[kind] = (state.counts[kind] ?? 0) + 1;
  state.log.push({ kind, model: url.pathname.split("/").pop(), t: Date.now(), parts: /EDITABLE PARTS: ([a-z, ]+)/.exec(raw)?.[1] });

  let cut = false;
  if (state.failNext > 0) {
    state.failNext--;
    if (state.mode === "truncate") cut = true;
    if (state.mode === "503") { res.writeHead(503, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { code: 503, message: "The model is overloaded.", status: "UNAVAILABLE" } })); return; }
  }
  const json = JSON.stringify(payload(kind, raw));
  const text = cut ? json.slice(0, Math.floor(json.length * 0.6)) : json;
  const usage = { promptTokenCount: 100, candidatesTokenCount: 200, totalTokenCount: 300 };
  if (!stream) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }], role: "model" }, finishReason: "STOP", index: 0 }], usageMetadata: usage }));
    return;
  }
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  const chunks = text.match(/[\s\S]{1,70}/g) ?? [];
  for (let i = 0; i < chunks.length; i++) {
    const last = i === chunks.length - 1;
    res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: chunks[i] }], role: "model" }, ...(last ? { finishReason: "STOP" } : {}), index: 0 }], usageMetadata: usage })}\r\n\r\n`);
    await new Promise((r) => setTimeout(r, state.delayMs));
  }
  res.end();
});
server.listen(4010, "127.0.0.1", () => console.log("fake gemini on :4010"));
