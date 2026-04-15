#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("../server/lib/playwrightEnv");
const logger = require("../server/lib/logger");
const { ensureAdminDashboard, loginFromCatalog, readSessionToken } = require("./lib/smoke_admin_auth");
const { ensureSpaDistFresh } = require("./lib/ensure_spa_dist_fresh");
const { findOpenPort, waitForHealth, startServer, stopServer } = require("./lib/smoke_runtime");

function isIgnorableConsoleError(text) {
  const value = String(text || "");
  if (!value) return false;
  return value.includes("favicon.ico");
}

async function cleanupCreatedItem({ baseUrl, token, id }) {
  if (!id || !token) return;
  const response = await fetch(`${baseUrl}/api/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => "");
    throw new Error(`cleanup failed for ${id}: ${response.status} ${body}`);
  }
}

async function waitUntilEnabled(locator, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!(await locator.isDisabled())) return;
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }
  throw new Error("timed out waiting for action button to become enabled");
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
  const logPath = path.join(outputDir, "spa-admin-smoke-writepath-server.log");
  const screenshotPath = path.join(outputDir, "spa-admin-smoke-writepath-content.png");

  const server = startServer(rootDir, port, logPath);
  const consoleErrors = [];
  const pageErrors = [];
  const apiServerErrors = [];
  let createdId = "";
  let authToken = "";

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
      page.on("response", (response) => {
        const status = response.status();
        const url = response.url();
        if (response.status() >= 500 && url.includes("/api/")) {
          apiServerErrors.push(`${status} ${response.request().method()} ${url}`);
        }
      });
      page.on("dialog", (dialog) => {
        if (dialog.type() === "confirm") {
          void dialog.accept();
          return;
        }
        void dialog.dismiss();
      });

      await loginFromCatalog(page, username, password, baseUrl);
      authToken = await readSessionToken(page);
      await ensureAdminDashboard(page, baseUrl);

      const adminNav = page.locator(".admin-nav");
      await adminNav.getByRole("link", { name: "内容", exact: true }).click();
      await page.waitForURL(/\/admin\/content$/, { timeout: 10000 });
      await page.getByRole("heading", { name: "内容管理" }).waitFor({ state: "visible", timeout: 10000 });

      await page.getByRole("heading", { name: "添加网页链接" }).waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("heading", { name: "内容列表" }).waitFor({ state: "visible", timeout: 10000 });

      const smokeToken = `spa-write-${Date.now()}`;
      const smokeUrl = `https://example.com/${smokeToken}`;
      const smokeTitle = `Smoke Link ${smokeToken}`;

      await page.getByLabel("链接").fill(smokeUrl);
      await page.getByLabel("标题（可选）").fill(smokeTitle);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" && response.url().includes("/api/items"),
        { timeout: 10000 },
      );
      const addButton = page.getByRole("button", { name: "添加" });
      await addButton.click();
      const createResponse = await createResponsePromise;
      if (!createResponse.ok()) {
        throw new Error(`create item failed: ${createResponse.status()}`);
      }

      const createdItem = await createResponse.json().catch(() => ({}));
      createdId = typeof createdItem?.id === "string" ? createdItem.id : "";
      await waitUntilEnabled(addButton);

      const listSearch = page.getByPlaceholder("搜索内容...");
      await listSearch.fill(smokeTitle);

      const createdCard = page.locator(".group", { hasText: smokeTitle }).first();
      await createdCard.waitFor({ state: "visible", timeout: 10000 });

      const cardText = await createdCard.innerText();
      if (!cardText.includes("link")) {
        throw new Error(`created item type mismatch, expected link: ${cardText}`);
      }

      const deleteResponsePromise = page.waitForResponse(
        (response) => {
          if (response.request().method() !== "DELETE") return false;
          const responseUrl = response.url();
          if (createdId) return responseUrl.includes(`/api/items/${encodeURIComponent(createdId)}`);
          return responseUrl.includes("/api/items/");
        },
        { timeout: 10000 },
      );
      await createdCard.locator("button").last().click();
      const deleteResponse = await deleteResponsePromise;
      if (!deleteResponse.ok()) {
        throw new Error(`delete item failed: ${deleteResponse.status()}`);
      }
      createdId = "";
      await createdCard.waitFor({ state: "hidden", timeout: 10000 });

      const remainingCount = await page.locator(".group", { hasText: smokeTitle }).count();
      if (remainingCount > 0) {
        throw new Error(`expected created item to be removed, but found ${remainingCount} matching card(s)`);
      }

      await page.screenshot({ path: screenshotPath, fullPage: false });
    } finally {
      await browser.close();
    }

    if (consoleErrors.length || pageErrors.length || apiServerErrors.length) {
      const parts = [];
      if (consoleErrors.length) parts.push(`console errors:\n- ${consoleErrors.join("\n- ")}`);
      if (pageErrors.length) parts.push(`page errors:\n- ${pageErrors.join("\n- ")}`);
      if (apiServerErrors.length) parts.push(`api 5xx responses:\n- ${apiServerErrors.join("\n- ")}`);
      throw new Error(parts.join("\n"));
    }

    logger.info("smoke_admin_write_pass", {
      baseUrl,
      screenshotPath,
      logPath,
    });
  } finally {
    await cleanupCreatedItem({ baseUrl, token: authToken, id: createdId }).catch((error) => {
      logger.error("smoke_admin_write_cleanup_failed", error, { itemId: createdId || null });
      process.exitCode = 1;
    });
    await stopServer(server);
  }
}

run().catch((err) => {
  logger.error("smoke_admin_write_failed", err);
  process.exitCode = 1;
});
