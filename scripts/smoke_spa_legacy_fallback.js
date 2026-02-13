#!/usr/bin/env node
const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("../server/lib/playwrightEnv");

async function findOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = Number(address?.port || 0);
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

async function waitForHealth(baseUrl, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server health check timeout: ${baseUrl}/api/health`);
}

function startServer(rootDir, port, logPath) {
  const logStream = fs.createWriteStream(logPath, { flags: "w" });
  const child = spawn("node", ["server/index.js"], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      SPA_DEFAULT_ENTRY: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  return { child, logStream };
}

function stopServer(ctx) {
  return new Promise((resolve) => {
    if (!ctx?.child || ctx.child.killed) {
      ctx?.logStream?.end();
      resolve();
      return;
    }
    ctx.child.once("exit", () => {
      ctx.logStream?.end();
      resolve();
    });
    ctx.child.kill("SIGTERM");
    setTimeout(() => {
      if (!ctx.child.killed) ctx.child.kill("SIGKILL");
    }, 1500);
  });
}

function isIgnorableConsoleError(text, locationUrl) {
  const value = String(text || "");
  const url = String(locationUrl || "");
  if (value.includes("favicon.ico")) return true;
  if (url.includes("/animations/")) return true;
  if (value.includes("Failed to load resource: net::ERR_ABORTED")) return true;
  return false;
}

async function run() {
  const rootDir = path.join(__dirname, "..");
  const spaIndexPath = path.join(rootDir, "frontend", "dist", "index.html");
  if (!fs.existsSync(spaIndexPath)) {
    throw new Error("frontend dist is missing, run `npm run build:frontend` before smoke:spa-legacy-fallback");
  }

  const outputDir = path.join(rootDir, "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const port = process.env.SMOKE_PORT ? Number.parseInt(process.env.SMOKE_PORT, 10) : await findOpenPort();
  const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`;
  const logPath = path.join(outputDir, "spa-legacy-fallback-smoke-server.log");
  const screenshotHomePath = path.join(outputDir, "spa-legacy-fallback-smoke-home.png");
  const screenshotViewerPath = path.join(outputDir, "spa-legacy-fallback-smoke-viewer.png");

  const server = startServer(rootDir, port, logPath);
  const consoleErrors = [];
  const pageErrors = [];

  try {
    await waitForHealth(baseUrl);

    const appEntry = await fetch(`${baseUrl}/app`, { cache: "no-store" });
    if (!appEntry.ok) {
      throw new Error(`expected /app to be available, got ${appEntry.status}`);
    }

    const appEntryText = await appEntry.text();
    if (!appEntryText.includes('id="app"')) {
      throw new Error("expected /app to serve SPA index");
    }

    const legacyViewerById = await fetch(`${baseUrl}/viewer.html?id=legacy-demo`, { redirect: "manual" });
    if (legacyViewerById.status !== 200) {
      throw new Error(`expected /viewer.html?id=... not to redirect when fallback enabled, got ${legacyViewerById.status}`);
    }

    const browser = await chromium.launch({
      headless: true,
      env: buildPlaywrightEnv({ rootDir }),
    });

    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });

      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        const locationUrl = message.location()?.url || "";
        if (isIgnorableConsoleError(text, locationUrl)) return;
        consoleErrors.push(`${text}${locationUrl ? ` @ ${locationUrl}` : ""}`);
      });

      page.on("pageerror", (error) => {
        const message = error?.message || String(error);
        const stack = error?.stack || "";
        if (stack.includes("/animations/")) return;
        pageErrors.push(message);
      });

      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      await page.locator("#search-input").waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#login-button").waitFor({ state: "visible", timeout: 10000 });
      const homeUrl = page.url();
      if (homeUrl !== `${baseUrl}/`) {
        throw new Error(`expected legacy home URL, got ${homeUrl}`);
      }
      await page.locator("#search-input").fill("动量");
      await page.screenshot({ path: screenshotHomePath, fullPage: false });

      await page.goto(`${baseUrl}/viewer.html?src=${encodeURIComponent("animations.json")}`, { waitUntil: "networkidle" });
      await page.locator("#viewer-frame").waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#viewer-open").waitFor({ state: "visible", timeout: 10000 });

      const viewerUrl = page.url();
      if (!viewerUrl.includes("/viewer.html")) {
        throw new Error(`expected legacy viewer URL, got ${viewerUrl}`);
      }

      const frameSrc = await page.locator("#viewer-frame").getAttribute("src");
      const openHref = await page.locator("#viewer-open").getAttribute("href");
      if (frameSrc !== "animations.json") {
        throw new Error(`legacy viewer frame src mismatch: ${frameSrc}`);
      }
      if (openHref !== "animations.json") {
        throw new Error(`legacy viewer open href mismatch: ${openHref}`);
      }
      await page.screenshot({ path: screenshotViewerPath, fullPage: false });
    } finally {
      await browser.close();
    }

    if (consoleErrors.length || pageErrors.length) {
      const parts = [];
      if (consoleErrors.length) parts.push(`console errors:\n- ${consoleErrors.join("\n- ")}`);
      if (pageErrors.length) parts.push(`page errors:\n- ${pageErrors.join("\n- ")}`);
      throw new Error(parts.join("\n"));
    }

    console.log(`[smoke-legacy-fallback] PASS ${baseUrl}`);
    console.log(`[smoke-legacy-fallback] home screenshot: ${screenshotHomePath}`);
    console.log(`[smoke-legacy-fallback] viewer screenshot: ${screenshotViewerPath}`);
    console.log(`[smoke-legacy-fallback] server log: ${logPath}`);
  } finally {
    await stopServer(server);
  }
}

run().catch((err) => {
  console.error("[smoke-legacy-fallback] FAIL");
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
