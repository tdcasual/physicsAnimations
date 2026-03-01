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
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
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

function waitForItemsRefresh(page, timeoutMs = 10000) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "GET" && response.url().includes("/api/items?"),
    { timeout: timeoutMs },
  );
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
      page.on("dialog", (dialog) => {
        if (dialog.type() === "confirm") {
          void dialog.accept();
          return;
        }
        void dialog.dismiss();
      });

      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

      await page.getByRole("banner").getByRole("button", { name: "登录" }).click();
      const loginDialog = page.getByRole("dialog", { name: "管理员登录" });
      await loginDialog.getByRole("textbox", { name: "用户名" }).fill(username);
      await loginDialog.getByRole("textbox", { name: "密码" }).fill(password);
      await loginDialog.getByRole("button", { name: "登录" }).click();

      await page.getByRole("link", { name: "管理" }).waitFor({ state: "visible", timeout: 10000 });
      authToken = await page.evaluate(() => sessionStorage.getItem("pa_admin_token") || "");

      await page.getByRole("link", { name: "管理" }).click();
      await page.waitForURL(/\/admin\/dashboard$/, { timeout: 10000 });

      await page.getByRole("link", { name: "内容" }).click();
      await page.waitForURL(/\/admin\/content$/, { timeout: 10000 });
      await page.getByRole("heading", { name: "内容管理" }).waitFor({ state: "visible", timeout: 10000 });

      const addPanel = page.locator(".admin-panel", {
        has: page.getByRole("heading", { name: "添加网页链接" }),
      });
      const listPanel = page.locator(".admin-panel", {
        has: page.getByRole("heading", { name: "内容列表" }),
      });

      const smokeToken = `spa-write-${Date.now()}`;
      const smokeUrl = `https://example.com/${smokeToken}`;
      const smokeTitle = `Smoke Link ${smokeToken}`;
      const smokeDescription = `自动化写路径校验 ${smokeToken}`;

      await addPanel.locator('input[type="url"]').fill(smokeUrl);
      await addPanel.locator('input[type="text"]').fill(smokeTitle);
      await addPanel.locator("textarea").fill(smokeDescription);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" && response.url().includes("/api/items/link"),
        { timeout: 10000 },
      );
      const addButton = addPanel.getByRole("button", { name: "添加" });
      await addButton.click();
      const createResponse = await createResponsePromise;
      if (!createResponse.ok()) {
        throw new Error(`create item failed: ${createResponse.status()}`);
      }

      const createdItem = await createResponse.json().catch(() => ({}));
      createdId = typeof createdItem?.id === "string" ? createdItem.id : "";
      await waitUntilEnabled(addButton);

      const listSearch = listPanel.locator('input[type="search"]');
      const searchResponsePromise = waitForItemsRefresh(page);
      await listSearch.fill(smokeTitle);
      await searchResponsePromise;

      const createdCard = listPanel.locator(".item-card", { hasText: smokeTitle }).first();
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
      const refreshAfterDeletePromise = waitForItemsRefresh(page);
      await createdCard.getByRole("button", { name: "删除" }).click();
      const deleteResponse = await deleteResponsePromise;
      await refreshAfterDeletePromise;
      if (!deleteResponse.ok()) {
        throw new Error(`delete item failed: ${deleteResponse.status()}`);
      }
      createdId = "";

      const remainingCount = await listPanel.locator(".item-card", { hasText: smokeTitle }).count();
      if (remainingCount > 0) {
        throw new Error(`expected created item to be removed, but found ${remainingCount} matching card(s)`);
      }

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
