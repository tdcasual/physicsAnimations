#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("../server/lib/playwrightEnv");
const logger = require("../server/lib/logger");
const { ensureAdminDashboard, loginFromCatalog } = require("./lib/smoke_admin_auth");
const { ensureSpaDistFresh } = require("./lib/ensure_spa_dist_fresh");
const { findOpenPort, waitForHealth, startServer, stopServer } = require("./lib/smoke_runtime");

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

      await loginFromCatalog(page, username, password, baseUrl);
      await ensureAdminDashboard(page, baseUrl);

      const adminPages = [
        { nav: "内容", heading: "内容管理", url: /\/admin\/content$/ },
        { nav: "上传", heading: "上传管理", url: /\/admin\/uploads$/ },
        { nav: "分类", heading: "分类管理", url: /\/admin\/taxonomy$/ },
        { nav: "系统", heading: "系统设置", url: /\/admin\/system$/ },
        { nav: "账号", heading: "账号设置", url: /\/admin\/account$/ },
      ];
      const adminNav = page.locator(".admin-nav");

      for (const pageCase of adminPages) {
        await adminNav.getByRole("link", { name: pageCase.nav, exact: true }).click();
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
