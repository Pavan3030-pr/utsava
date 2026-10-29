// Uses the Chrome you already have installed (no browser download, works with npm's script blocking).
// Override with CHROME_PATH=/path/to/chrome. E2E_SPARTICUZ=1 uses a bundled serverless Chromium (Linux CI).
import { existsSync } from "node:fs";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

export async function launch() {
  const puppeteer = (await import("puppeteer-core")).default;
  if (process.env.E2E_SPARTICUZ) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({ args: [...chromium.args, "--no-sandbox"], executablePath: await chromium.executablePath(), headless: "shell" });
  }
  const executablePath = CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) {
    throw new Error("Couldn't find Google Chrome. Install it from https://www.google.com/chrome or run with CHROME_PATH=/path/to/chrome");
  }
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
}
