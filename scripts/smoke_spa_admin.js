#!/usr/bin/env node
const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("../server/lib/playwrightEnv");
const logger = require("../server/lib/logger");
const { ensureSpaDistFresh } = require("./lib/ensure_spa_dist_fresh");

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
  const smokeUsername = process.env.SMOKE_ADMIN_USERNAME || "admin";
  const smokePassword = process.env.SMOKE_ADMIN_PASSWORD || "admin";
  const child = spawn("node", ["server/index.js"], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      ADMIN_USERNAME: process.env.ADMIN_USERNAME || smokeUsername,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || smokePassword,
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

function isIgnorableConsoleError(text) {
  const value = String(text || "");
  if (!value) return false;
  return value.includes("favicon.ico");
}

async function run() {
  const rootDir = path.join(__dirname, "..");
  ensureSpaDistFresh(rootDir);
  const outputDir = path.join(rootDir, "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const username = process.env.SMOKE_ADMIN_USERNAME || "admin";
  const password = process.env.SMOKE_ADMIN_PASSWORD || "admin";
  const port = process.env.SMOKE_PORT ? Number.parseInt(process.env.SMOKE_PORT, 10) : await findOpenPort();
  const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`;
  const logPath = path.join(outputDir, "spa-admin-smoke-server.log");
  const screenshotPath = path.join(outputDir, "spa-admin-smoke-home-after-logout.png");

  const server = startServer(rootDir, port, logPath);
  const consoleErrors = [];
  const pageErrors = [];

  try {
    await waitForHealth(baseUrl);

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
        if (isIgnorableConsoleError(text)) return;
        consoleErrors.push(text);
      });
      page.on("pageerror", (error) => {
        pageErrors.push(error?.message || String(error));
      });

      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

      await page.getByRole("banner").getByRole("button", { name: "登录" }).click();
      const loginDialog = page.getByRole("dialog", { name: "管理员登录" });
      await loginDialog.getByRole("textbox", { name: "用户名" }).fill(username);
      await loginDialog.getByRole("textbox", { name: "密码" }).fill(password);
      await loginDialog.getByRole("button", { name: "登录" }).click();

      await page.getByRole("link", { name: "管理" }).waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("link", { name: "管理" }).click();
      await page.waitForURL(/\/admin\/dashboard$/, { timeout: 10000 });

      const adminPages = [
        { nav: "内容", heading: "内容管理", url: /\/admin\/content$/ },
        { nav: "上传", heading: "上传管理", url: /\/admin\/uploads$/ },
        { nav: "分类", heading: "分类管理", url: /\/admin\/taxonomy$/ },
        { nav: "系统", heading: "系统设置", url: /\/admin\/system$/ },
        { nav: "账号", heading: "账号设置", url: /\/admin\/account$/ },
      ];

      for (const pageCase of adminPages) {
        await page.getByRole("link", { name: pageCase.nav }).click();
        await page.waitForURL(pageCase.url, { timeout: 10000 });
        await page.getByRole("heading", { name: pageCase.heading }).waitFor({ state: "visible", timeout: 10000 });
      }

      await page.getByRole("button", { name: "退出" }).click();
      await page.waitForURL(/\/$/, { timeout: 10000 });
      await page.getByRole("button", { name: "登录" }).waitFor({ state: "visible", timeout: 10000 });
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } finally {
      await browser.close();
    }

    if (consoleErrors.length || pageErrors.length) {
      const parts = [];
      if (consoleErrors.length) parts.push(`console errors:\n- ${consoleErrors.join("\n- ")}`);
      if (pageErrors.length) parts.push(`page errors:\n- ${pageErrors.join("\n- ")}`);
      throw new Error(parts.join("\n"));
    }

    logger.info("smoke_admin_pass", {
      baseUrl,
      screenshotPath,
      logPath,
    });
  } finally {
    await stopServer(server);
  }
}

run().catch((err) => {
  logger.error("smoke_admin_failed", err);
  process.exitCode = 1;
});
