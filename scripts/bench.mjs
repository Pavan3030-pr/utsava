// Measures real latency of the 4 parallel plan slices against a running server.
//   npm run dev        (in one terminal)
//   npm run bench      (in another)   or   BASE_URL=https://your-app.vercel.app npm run bench
const base = process.env.BASE_URL ?? "http://localhost:3000";
const intake = {
  type: "wedding", title: "Priya & Rahul", date: "2027-02-14", guests: 200,
  budget: 2500000, location: "Hyderabad", language: "en",
};
const parts = ["core", "schedule", "ops", "ideas"];

async function run(part) {
  const t0 = performance.now();
  const res = await fetch(`${base}/api/plan/stream?part=${part}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(intake),
  });
  if (!res.ok) throw new Error(`${part}: HTTP ${res.status} ${await res.text()}`);
  const reader = res.body.getReader();
  let first = null, bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (first === null) first = performance.now() - t0;
    bytes += value.length;
  }
  return { part, "first byte (ms)": Math.round(first ?? 0), "complete (ms)": Math.round(performance.now() - t0), bytes };
}

const wall = performance.now();
try {
  const rows = await Promise.all(parts.map(run));
  console.table(rows);
  const total = (performance.now() - wall) / 1000;
  const firstAny = Math.min(...rows.map((r) => r["first byte (ms)"])) / 1000;
  console.log(`\nFirst content after ${firstAny.toFixed(1)}s · full plan after ${total.toFixed(1)}s  (wall clock, 4 slices in parallel)`);
} catch (e) {
  console.error("Benchmark failed:", e.message);
  process.exit(1);
}
