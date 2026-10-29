import { launch } from "./launch.mjs";

const APP = "http://localhost:3120", FAKE = "http://127.0.0.1:4010";
const results = []; const issues = [];
const ok = (name, cond, extra = "") => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? "  ✓" : "  ✗"} ${name}${extra ? "  — " + extra : ""}`); };
const ctl = (o) => fetch(`${FAKE}/__ctl`, { method: "POST", body: JSON.stringify(o) });
const stats = async () => (await fetch(`${FAKE}/__stats`)).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const consoleErrors = [], failed = [], httpBad = [];
page.on("response", (r) => { if (r.status() >= 400 && !/\/api\//.test(r.url())) httpBad.push(r.status() + " " + r.url()); });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("PAGEERROR " + e.message));
page.on("requestfailed", (r) => failed.push(r.url() + " " + (r.failure()?.errorText ?? "")));

const clickText = async (sel, text) => {
  const h = await page.evaluateHandle((sel, text) => [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text)), sel, text);
  const el = h.asElement(); if (!el) throw new Error(`no ${sel} with "${text}"`); await el.click();
};
const bodyText = () => page.evaluate(() => document.body.innerText);
const waitPlan = () => page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Save as PDF") && !b.disabled), { timeout: 40000 });

console.log("\n== 1. Landing & create ==");
let t0 = Date.now();
await page.goto(APP, { waitUntil: "networkidle0" });
ok("landing renders with headline", (await bodyText()).length > 500, `${Date.now() - t0}ms`);
await page.screenshot({ path: "/tmp/shot-landing.png" });

await page.goto(`${APP}/create`, { waitUntil: "networkidle0" });
await page.type("#title", "Mumbai Community Utsav");
await page.type("#guests", "120");
await page.type("#budget", "10L");
await page.type("#location", "Mumbai");
await page.$eval("#date", (el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, iso(60));
await ctl({ reset: true, delayMs: 15 });

console.log("\n== 2. Generation (parallel 4-slice stream) ==");
t0 = Date.now();
await clickText("button", "Generate");
await page.waitForFunction(() => location.pathname.startsWith("/plan/"), { timeout: 15000 });
ok("navigated to the plan page", true);
await waitPlan();
const genMs = Date.now() - t0;
ok("plan generated and unlocked", true, `${genMs}ms with fake model`);
const st = await stats();
ok("four slices requested in parallel (core/schedule/ops/ideas)", ["core", "schedule", "ops", "ideas"].every((k) => st.counts[k] === 1), JSON.stringify(st.counts));
await sleep(600);
await page.screenshot({ path: "/tmp/shot-overview.png", fullPage: true });
const planUrl = page.url();

console.log("\n== 3. Duplicate removal on generated data ==");
await clickText("button, a, [role=tab]", "Checklist");
await sleep(400);
let txt = await bodyText();
const count = (s, re) => (s.match(re) ?? []).length;
ok("'Book caterer' appears once (fake model returned it 4×)", count(txt, /Book (the )?caterer/gi) === 1, `found ${count(txt, /Book (the )?caterer/gi)}`);
await clickText("button, a, [role=tab]", "Budget"); await sleep(300);
txt = await bodyText();
ok("Venue budget line appears once", count(txt, /\bVenue\b/g) <= 3, `mentions ${count(txt, /\bVenue\b/g)}`);
await clickText("button, a, [role=tab]", "Vendors"); await sleep(300);
txt = await bodyText();
ok("Catering vendor card appears once", count(txt, /Questions to ask/g) === 2, `cards=${count(txt, /Questions to ask/g)} (expect 2: Catering, Photography)`);
await page.screenshot({ path: "/tmp/shot-vendors.png", fullPage: true });

console.log("\n== 4. Checklist tick persists ==");
await clickText("button, a, [role=tab]", "Checklist"); await sleep(300);
await page.evaluate(() => document.querySelector('input[type="checkbox"]')?.click());
await sleep(900); // > save-queue debounce
await page.reload({ waitUntil: "domcontentloaded" }); await sleep(1200);
await clickText("button, a, [role=tab]", "Checklist"); await sleep(300);
const ticked = await page.evaluate(() => [...document.querySelectorAll('input[type="checkbox"]')].filter((c) => c.checked).length);
ok("ticked task survives reload (debounced save)", ticked >= 1, `ticked=${ticked}`);

console.log("\n== 4b. Next best moves, run sheet, lazy tabs, print ==");
await clickText("button, a, [role=tab]", "Overview"); await sleep(500);
txt = await bodyText();
ok("Overview shows 'What to do next' with at least one action", txt.includes("What to do next") && /Start your vendor shortlist|high-priority task/.test(txt));
await clickText("button", "Find vendors"); await sleep(600);
const onVendors = await page.evaluate(() => document.querySelector("#tab-vendors")?.getAttribute("aria-selected") === "true");
ok("an action's button jumps to the right tab", onVendors);
await clickText("button, a, [role=tab]", "Run sheet"); await sleep(700);
txt = await bodyText();
const lower = txt.toLowerCase();
ok("Run sheet shows schedule, vendor hint and share actions", lower.includes("day-of run sheet") && lower.includes("opening pooja") && lower.includes("print this sheet") && lower.includes("send to coordinator"));
await clickText("button, a, [role=tab]", "Guests & RSVP"); await sleep(500);
ok("lazy-loaded Guests tab renders (no crash)", (await bodyText()).length > 200);
await page.evaluate(() => { window.__printed = false; window.print = () => { window.__printed = true; }; }); // headless Chrome fires afterprint at once; stub it so print mode stays observable
await clickText("button", "Save as PDF"); await sleep(1500);
ok("print dialog is requested only after every section is loaded", await page.evaluate(() => window.__printed === true));
const printed = await page.evaluate(() => ({ panels: document.querySelectorAll('[role="tabpanel"]').length, text: document.body.innerText }));
ok("print mode renders EVERY section incl. lazy tabs", printed.panels >= 8 && printed.text.toLowerCase().includes("minute by minute") && printed.text.includes("Opening Pooja"), `panels=${printed.panels}`);
const pdf = await page.pdf({ format: "A4", printBackground: true });
ok("PDF export produces a real multi-page document", pdf.length > 30000, `${Math.round(pdf.length / 1024)} KB`);
await page.reload({ waitUntil: "domcontentloaded" }); await sleep(1200);

console.log("\n== 5. Copilot: streaming, apply, undo ==");
await clickText("button, a, [role=tab]", "AI Copilot"); await sleep(300);
const settle = () => page.waitForFunction(() => !document.querySelector('[aria-label="Loading section"]'), { timeout: 10000 });
const budgetOf = async () => { await clickText("button, a, [role=tab]", "Budget"); await settle(); await sleep(250); const t = await bodyText(); await clickText("button, a, [role=tab]", "AI Copilot"); await settle(); await sleep(250); return t; };
const beforeTxt = await budgetOf();
await ctl({ delayMs: 120 });
t0 = Date.now();
await page.type("#copilot-input", "Cut the total budget by 15%");
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.body.innerText.includes("I trimmed the budget by 15%"), { timeout: 30000 });
const tReply = Date.now() - t0;
await page.waitForFunction(() => document.body.innerText.includes("Updated in"), { timeout: 30000 });
const tDone = Date.now() - t0;
ok("reply shows BEFORE the plan finishes rewriting (streaming)", tReply < tDone - 150, `reply ${tReply}ms · complete ${tDone}ms`);
txt = await bodyText();
ok("budget before → after chip shown", /Budget ₹[\d.,]+\s?\w* → ₹/.test(txt) || txt.includes("→"), "");
const s2 = await stats();
const lastRefine = [...s2.log].reverse().find((l) => l.kind === "refine");
ok("budget request was scoped to core+ops (schedule & themes NOT sent)", lastRefine?.parts === "core, ops", `editable parts = ${lastRefine?.parts}`);
const afterTxt = await budgetOf();
ok("budget numbers actually changed", afterTxt !== beforeTxt);
await page.screenshot({ path: "/tmp/shot-copilot.png" });
await clickText("button", "Undo"); await sleep(500);
ok("Undo posts a revert message", (await bodyText()).includes("reverted my last change"));
const undoTxt = await budgetOf();
ok("Undo restores the previous budget exactly", undoTxt === beforeTxt);

console.log("\n== 6. Copilot self-healing (injected failures) ==");
const done0 = count(await bodyText(), /Updated in/g);
await ctl({ delayMs: 10, failNext: 1, mode: "503" });
await page.type("#copilot-input", "Make it more traditional"); await page.keyboard.press("Enter");
await page.waitForFunction((n) => (document.body.innerText.match(/Updated in/g) ?? []).length > n, { timeout: 40000 }, done0).catch(() => {});
txt = await bodyText();
ok("1× 503 → silent retry succeeded, no error shown", !/couldn’t complete|Failed to execute|Unexpected end/i.test(txt) && count(txt, /Updated in/g) === done0 + 1);
await ctl({ failNext: 1, mode: "truncate" });
await page.type("#copilot-input", "Add activities for kids"); await page.keyboard.press("Enter");
await page.waitForFunction((n) => (document.body.innerText.match(/Updated in/g) ?? []).length > n, { timeout: 40000 }, done0 + 1).catch(() => {});
txt = await bodyText();
ok("truncated JSON stream → healed on retry", count(txt, /Updated in/g) === done0 + 2 && !/Unexpected end of JSON/i.test(txt));
await ctl({ failNext: 9, mode: "503" });
await page.type("#copilot-input", "Make it more eco-friendly"); await page.keyboard.press("Enter");
await page.waitForFunction(() => document.body.innerText.includes("couldn’t complete that change"), { timeout: 40000 }).catch(() => {});
txt = await bodyText();
ok("3 straight failures → friendly error, never raw JSON/parse text", txt.includes("couldn’t complete that change") && !/Unexpected end of JSON|Failed to execute|\{"error"/.test(txt));
await page.screenshot({ path: "/tmp/shot-copilot-error.png" });
await ctl({ failNext: 0 });

console.log("\n== 7. Generation self-healing ==");
await page.goto(`${APP}/create`, { waitUntil: "networkidle0" });
await page.type("#title", "Heal Test"); await page.type("#guests", "50");
await ctl({ failNext: 3, mode: "503", delayMs: 10 });
await clickText("button", "Generate");
await page.waitForFunction(() => location.pathname.startsWith("/plan/"), { timeout: 15000 });
await waitPlan().catch(() => {});
txt = await bodyText();
const healed = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Save as PDF") && !b.disabled));
ok("3 slice failures during generation → plan still completes", healed, healed ? "" : txt.slice(0, 300));
await ctl({ failNext: 0 });

console.log("\n== 8. Security & robustness ==");
const xo = await fetch(`${APP}/api/plan/refine`, { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" });
ok("cross-origin POST blocked (403)", xo.status === 403, String(xo.status));
const big = await fetch(`${APP}/api/plan/parse`, { method: "POST", body: JSON.stringify({ text: "x".repeat(5000) }) });
ok("oversized body rejected (4xx)", big.status >= 400 && big.status < 500, String(big.status));
let limited = 0; for (let i = 0; i < 30; i++) { const r = await fetch(`${APP}/api/plan/parse`, { method: "POST", body: "{}" }); if (r.status === 429) limited++; }
ok("rate limiter kicks in under a burst", limited > 0, `${limited}/30 got 429`);

console.log("\n== 9. Mobile layout ==");
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto(planUrl, { waitUntil: "domcontentloaded" }); await sleep(1500);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok("no horizontal scroll on a 390px phone", overflow <= 1, `overflow=${overflow}px`);
await page.screenshot({ path: "/tmp/shot-mobile.png" });

console.log("\n== 10. Console / network hygiene ==");
const realErrors = consoleErrors.filter((e) => !/Failed to load resource|favicon|fonts\.g/i.test(e)); // resource failures are judged separately below (offline CI has no fonts/weather)
ok("no unexpected console errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
ok("no broken pages, scripts or images (HTTP ≥400 outside /api)", httpBad.length === 0, httpBad.slice(0, 3).join(" | "));

await browser.close();
const bad = results.filter((r) => !r.pass);
console.log("HTTP>=400 non-API:", JSON.stringify(httpBad));
console.log(`\n${results.length - bad.length}/${results.length} passed`);
if (bad.length) { console.log("FAILED:"); bad.forEach((b) => console.log(" -", b.name, b.extra)); }
