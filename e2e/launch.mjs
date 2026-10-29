// Real Chrome via puppeteer. E2E_SPARTICUZ=1 uses the serverless Chromium build (Linux CI / sandboxes without Chrome).
export async function launch() {
  if (process.env.E2E_SPARTICUZ) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;
    return puppeteer.launch({ args: [...chromium.args, "--no-sandbox"], executablePath: await chromium.executablePath(), headless: "shell" });
  }
  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
}
