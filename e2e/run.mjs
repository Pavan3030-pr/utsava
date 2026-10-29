// Usage (from the repo root):  npm run build && cd e2e && npm install && npm test      (or: npm run a11y)
// Starts a fake Gemini server + `next start`, runs the browser suite, then shuts everything down.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const script = process.argv[2] === "axe" ? "axe.mjs" : "e2e.mjs";
const children = [];
const stop = () => children.forEach((c) => { try { c.kill("SIGTERM"); } catch { /* already gone */ } });
process.on("exit", stop); process.on("SIGINT", () => { stop(); process.exit(130); });

const run = (cmd, args, opts) => { const c = spawn(cmd, args, { stdio: "inherit", ...opts }); children.push(c); return c; };
run("node", [path.join(here, "fake-gemini.mjs")], { stdio: "ignore" });
run("npx", ["next", "start", "-p", "3120"], {
  cwd: root, stdio: "ignore",
  env: { ...process.env, GOOGLE_GENERATIVE_AI_API_KEY: "fake", GOOGLE_GENERATIVE_AI_BASE_URL: "http://127.0.0.1:4010/v1beta" },
});

for (let i = 0; i < 60; i++) {
  try { if ((await fetch("http://localhost:3120/api/health")).ok) break; } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 1000));
}
const t = run("node", [path.join(here, script)], { cwd: here });
t.on("exit", (code) => { stop(); process.exit(code ?? 1); });
