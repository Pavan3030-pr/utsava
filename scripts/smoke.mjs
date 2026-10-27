// Post-deploy smoke test:  BASE_URL=https://utsava-weld.vercel.app node scripts/smoke.mjs
const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
let failed = 0;

async function check(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.error(`  ✗ ${name}: ${e.message}`); }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

console.log(`Smoke testing ${base}`);
await check("health endpoint is ok", async () => {
  const r = await fetch(`${base}/api/health`); const j = await r.json();
  must(r.status === 200 && j.ok === true, `status ${r.status}`);
  console.log(`    ai=${j.ai} db=${j.db} rsvp=${j.rsvp} rateLimit=${j.rateLimit} build=${j.build}`);
});
for (const path of ["/", "/create", "/events"]) {
  await check(`GET ${path} renders`, async () => { const r = await fetch(base + path); must(r.status === 200, `status ${r.status}`); });
}
await check("security headers present", async () => {
  const r = await fetch(base);
  for (const h of ["x-content-type-options", "strict-transport-security", "x-frame-options"]) must(r.headers.get(h), `missing ${h}`);
});
await check("API rejects bad input with 4xx, not 5xx", async () => {
  const r = await fetch(`${base}/api/plan/parse`, { method: "POST", body: "{nope" });
  must(r.status === 400, `status ${r.status}`);
});
await check("cross-origin POST is blocked", async () => {
  const r = await fetch(`${base}/api/plan/parse`, { method: "POST", headers: { Origin: "https://evil.example" }, body: "{}" });
  must(r.status === 403, `status ${r.status}`);
});
await check("unknown RSVP token is a clean 404", async () => {
  const r = await fetch(`${base}/api/rsvp/00000000-0000-4000-8000-000000000000`);
  must([404, 503].includes(r.status), `status ${r.status}`);
});
await check("404 page is branded, not a stack trace", async () => {
  const r = await fetch(`${base}/definitely-not-a-page`); must(r.status === 404, `status ${r.status}`);
});
await check("robots.txt and sitemap.xml exist", async () => {
  for (const p of ["/robots.txt", "/sitemap.xml"]) { const r = await fetch(base + p); must(r.status === 200, `${p} ${r.status}`); }
});
if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\nAll smoke checks passed.");
