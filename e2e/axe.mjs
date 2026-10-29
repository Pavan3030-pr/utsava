import { launch } from "./launch.mjs";
import { readFileSync } from "node:fs";
const axeSrc = readFileSync(new URL("./node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const APP = "http://localhost:3120";
const browser = await launch();
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const all = {};
async function audit(name) {
  await page.evaluate(axeSrc);
  const r = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } }));
  for (const v of r.violations) if (v.id === "color-contrast") for (const n of v.nodes) { const d = n.any[0]?.data ?? {}; const key = `${d.fgColor} on ${d.bgColor} (${d.contrastRatio}) size=${d.fontSize}`; (globalThis.cc ??= {})[key] ??= { sel: n.target.join(" "), html: n.html.slice(0, 90), pages: new Set() }; globalThis.cc[key].pages.add(name); }
  for (const v of r.violations) (all[v.id] ??= { impact: v.impact, help: v.help, where: new Set(), nodes: [] }).where.add(name), all[v.id].nodes.push(...v.nodes.slice(0, 2).map((n) => n.html.slice(0, 140)));
  console.log(`  ${name}: ${r.violations.length} violation types, ${r.passes.length} rules passed`);
}
await page.goto(APP, { waitUntil: "networkidle0" }); await audit("landing");
await page.goto(`${APP}/create`, { waitUntil: "networkidle0" }); await audit("create");
await page.type("#title", "A11y Fest"); await page.type("#guests", "80");
await page.$eval("#date", (el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10)); el.dispatchEvent(new Event("input", { bubbles: true })); });
await (await page.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Generate")))).asElement().click();
await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Save as PDF") && !b.disabled), { timeout: 40000 });
await sleep(800);
for (const tab of ["Overview", "Budget", "Spend tracker", "Schedule", "Checklist", "Vendors", "Ideas & invite", "AI Copilot"]) {
  await (await page.evaluateHandle((t) => [...document.querySelectorAll('[role=tab], nav button, button')].find((e) => e.textContent.trim().includes(t)), tab)).asElement().click();
  await sleep(500); await audit(tab);
}
await page.goto(`${APP}/events`, { waitUntil: "networkidle0" }); await audit("events");
console.log("\nCONTRAST:"); for (const [k, v] of Object.entries(globalThis.cc ?? {})) console.log(`- ${k}\n    ${v.sel}\n    ${v.html}\n    pages: ${[...v.pages].join(", ")}`);
console.log("\nVIOLATIONS:");
for (const [id, v] of Object.entries(all)) console.log(`- [${v.impact}] ${id}: ${v.help}  (on: ${[...v.where].join(", ")})\n    e.g. ${[...new Set(v.nodes)].slice(0, 2).join("\n         ")}`);
if (!Object.keys(all).length) console.log("none");
await browser.close();
