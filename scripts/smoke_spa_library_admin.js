#!/usr/bin/env node
const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
const { Blob } = require("node:buffer");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("../server/lib/playwrightEnv");
const logger = require("../server/lib/logger");

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

async function requestJson(baseUrl, token, pathName, init = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function run() {
  const rootDir = path.join(__dirname, "..");
  const outputDir = path.join(rootDir, "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const username = process.env.SMOKE_ADMIN_USERNAME || "admin";
  const password = process.env.SMOKE_ADMIN_PASSWORD || "admin";
  const port = process.env.SMOKE_PORT ? Number.parseInt(process.env.SMOKE_PORT, 10) : await findOpenPort();
  const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`;
  const logPath = path.join(outputDir, "spa-library-admin-smoke-server.log");
  const screenshotPath = path.join(outputDir, "spa-library-admin-smoke.png");

  const folderToken = `lib-smoke-${Date.now()}`;
  const folderName = `Smoke Folder ${folderToken}`;
  const uploadName = `smoke-${folderToken}.ggb`;

  const server = startServer(rootDir, port, logPath);
  const consoleErrors = [];
  const pageErrors = [];
  let folderId = "";
  let assetId = "";
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

      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      await page.getByRole("banner").getByRole("button", { name: "登录" }).click();
      const loginDialog = page.getByRole("dialog", { name: "管理员登录" });
      await loginDialog.getByRole("textbox", { name: "用户名" }).fill(username);
      await loginDialog.getByRole("textbox", { name: "密码" }).fill(password);
      await loginDialog.getByRole("button", { name: "登录" }).click();
      await page.getByRole("link", { name: "管理" }).waitFor({ state: "visible", timeout: 10000 });

      await page.goto(`${baseUrl}/admin/library`, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "资源库管理" }).waitFor({ state: "visible", timeout: 10000 });
      authToken = await page.evaluate(() => sessionStorage.getItem("pa_admin_token") || "");
      if (!authToken) throw new Error("missing auth token after login");

      const createdFolder = await requestJson(baseUrl, authToken, "/api/library/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName, categoryId: "other" }),
      });
      if (!createdFolder.response.ok) {
        throw new Error(`create folder failed: ${createdFolder.response.status}`);
      }
      folderId = String(createdFolder.body?.folder?.id || "");
      if (!folderId) throw new Error("create folder returned empty id");

      const uploadForm = new FormData();
      uploadForm.append("file", new Blob([Buffer.from("GGBDATA", "utf8")]), uploadName);
      uploadForm.append("openMode", "embed");
      const uploaded = await requestJson(baseUrl, authToken, `/api/library/folders/${encodeURIComponent(folderId)}/assets`, {
        method: "POST",
        body: uploadForm,
      });
      if (!uploaded.response.ok) {
        throw new Error(`upload asset failed: ${uploaded.response.status}`);
      }
      assetId = String(uploaded.body?.asset?.id || "");
      if (!assetId) throw new Error("upload asset returned empty id");

      await page.reload({ waitUntil: "networkidle" });
      await page.locator(".folder-item", { hasText: folderName }).first().waitFor({ state: "visible", timeout: 10000 });

      const softDelete = await requestJson(baseUrl, authToken, `/api/library/assets/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
      });
      if (!softDelete.response.ok) {
        throw new Error(`soft delete failed: ${softDelete.response.status}`);
      }

      const deletedList1 = await requestJson(
        baseUrl,
        authToken,
        `/api/library/deleted-assets?folderId=${encodeURIComponent(folderId)}`,
      );
      if (!deletedList1.response.ok || !Array.isArray(deletedList1.body?.assets) || deletedList1.body.assets.length !== 1) {
        throw new Error("deleted list after soft delete is invalid");
      }

      const restored = await requestJson(baseUrl, authToken, `/api/library/assets/${encodeURIComponent(assetId)}/restore`, {
        method: "POST",
      });
      if (!restored.response.ok) {
        throw new Error(`restore failed: ${restored.response.status}`);
      }

      const softDeleteAgain = await requestJson(baseUrl, authToken, `/api/library/assets/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
      });
      if (!softDeleteAgain.response.ok) {
        throw new Error(`soft delete again failed: ${softDeleteAgain.response.status}`);
      }

      const hardDelete = await requestJson(baseUrl, authToken, `/api/library/assets/${encodeURIComponent(assetId)}/permanent`, {
        method: "DELETE",
      });
      if (!hardDelete.response.ok) {
        throw new Error(`permanent delete failed: ${hardDelete.response.status}`);
      }
      assetId = "";

      const deletedList2 = await requestJson(
        baseUrl,
        authToken,
        `/api/library/deleted-assets?folderId=${encodeURIComponent(folderId)}`,
      );
      if (!deletedList2.response.ok || !Array.isArray(deletedList2.body?.assets) || deletedList2.body.assets.length !== 0) {
        throw new Error("deleted list after permanent delete is invalid");
      }

      const removeFolder = await requestJson(baseUrl, authToken, `/api/library/folders/${encodeURIComponent(folderId)}`, {
        method: "DELETE",
      });
      if (!removeFolder.response.ok) {
        throw new Error(`remove folder failed: ${removeFolder.response.status}`);
      }
      folderId = "";

      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "资源库管理" }).waitFor({ state: "visible", timeout: 10000 });
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } finally {
      await browser.close();
    }

    if (consoleErrors.length || pageErrors.length) {
      const parts = [];
      if (consoleErrors.length) parts.push(`console errors:\\n- ${consoleErrors.join("\\n- ")}`);
      if (pageErrors.length) parts.push(`page errors:\\n- ${pageErrors.join("\\n- ")}`);
      throw new Error(parts.join("\\n"));
    }

    logger.info("smoke_library_admin_pass", {
      baseUrl,
      screenshotPath,
      logPath,
    });
  } finally {
    if (assetId && authToken) {
      await requestJson(baseUrl, authToken, `/api/library/assets/${encodeURIComponent(assetId)}/permanent`, {
        method: "DELETE",
      }).catch(() => {});
      await requestJson(baseUrl, authToken, `/api/library/assets/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    if (folderId && authToken) {
      await requestJson(baseUrl, authToken, `/api/library/folders/${encodeURIComponent(folderId)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    await stopServer(server);
  }
}

run().catch((err) => {
  logger.error("smoke_library_admin_failed", err);
  process.exitCode = 1;
});
