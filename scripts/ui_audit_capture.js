#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("../server/lib/playwrightEnv");
const { CATALOG_READY_SELECTORS, waitForCatalogReadyState } = require("./lib/catalog_ready_state");
const { loginFromCatalog, readSessionToken } = require("./lib/smoke_admin_auth");
const { ensureSpaDistFresh } = require("./lib/ensure_spa_dist_fresh");
const { findOpenPort, startServer, stopServer, waitForHealth } = require("./lib/smoke_runtime");
const { captureViewportSuite } = require("./lib/ui_audit_capture_runtime");

const TEMP_VIEWER_FIXTURE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UI 审图临时演示</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Georgia, "Noto Serif SC", serif;
      background: radial-gradient(circle at top, #eef3ff, #dfe7fa 44%, #f6efe3 100%);
      color: #23314f;
    }
    main {
      width: min(92vw, 920px);
      padding: 48px;
      border-radius: 32px;
      background: rgba(255,255,255,0.76);
      border: 1px solid rgba(35,49,79,0.12);
      box-shadow: 0 24px 60px rgba(35,49,79,0.16);
    }
    h1 {
      margin: 0 0 12px;
      font-size: 56px;
      line-height: 1.05;
    }
    p {
      margin: 0;
      font-size: 24px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <main>
    <h1>课堂摆锤演示</h1>
    <p>temp viewer fixture for UI audit capture</p>
  </main>
</body>
</html>`;

function parseTagArg(argv) {
  const defaultTag = "before";
  const inlineArg = argv.find((arg) => arg.startsWith("--tag="));
  if (inlineArg) {
    const value = String(inlineArg.split("=")[1] || "").trim();
    return value || defaultTag;
  }

  const tagIndex = argv.findIndex((arg) => arg === "--tag");
  if (tagIndex === -1) return defaultTag;
  const value = String(argv[tagIndex + 1] || "").trim();
  return value || defaultTag;
}

function parseViewportOnly(argv) {
  return argv.includes("--viewport-only");
}

function isIgnorableConsoleError(text, locationUrl) {
  const value = String(text || "");
  const url = String(locationUrl || "");
  if (!value && !url) return false;
  return value.includes("favicon.ico");
}

async function capturePage(page, filePath, options = {}) {
  await page.screenshot({
    path: filePath,
    fullPage: options.fullPage === true,
  });
}

async function waitForHeading(page, heading) {
  await page.getByRole("heading", { name: heading }).first().waitFor({ state: "visible", timeout: 10000 });
}

async function createTemporaryViewerFixture(context, token) {
  const response = await context.request.post("/api/items", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    multipart: {
      file: {
        name: "viewer-fixture.html",
        mimeType: "text/html",
        buffer: Buffer.from(TEMP_VIEWER_FIXTURE_HTML, "utf8"),
      },
      categoryId: "other",
      title: "UI 审图临时演示",
      description: "temp viewer fixture for UI audit capture",
    },
  });

  if (!response.ok()) {
    throw new Error(`createTemporaryViewerFixture failed: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();
  if (!data?.id) {
    throw new Error("createTemporaryViewerFixture failed: missing id");
  }

  return data;
}

async function deleteTemporaryViewerFixture(context, token, itemId) {
  if (!itemId) return;
  const response = await context.request.delete(`/api/items/${encodeURIComponent(itemId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok()) {
    throw new Error(`deleteTemporaryViewerFixture failed: ${response.status()} ${await response.text()}`);
  }
}

async function run() {
  const rootDir = path.join(__dirname, "..");
  ensureSpaDistFresh(rootDir);

  const argv = process.argv.slice(2);
  const tag = parseTagArg(argv);
  const viewportOnly = parseViewportOnly(argv);
  const captureFullPage = !viewportOnly;
  const outputDir = path.join(rootDir, "output", "playwright", "ui-audit");
  fs.mkdirSync(outputDir, { recursive: true });

  const username = process.env.SMOKE_ADMIN_USERNAME || "admin";
  const password = process.env.SMOKE_ADMIN_PASSWORD || "admin";
  const port = process.env.SMOKE_PORT ? Number.parseInt(process.env.SMOKE_PORT, 10) : await findOpenPort();
  const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`;
  const logPath = path.join(outputDir, `ui-audit-${tag}-server.log`);

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
      await captureViewportSuite({
        browser,
        baseUrl,
        outputDir,
        tag,
        viewportName: "desktop",
        contextOptions: {
          viewport: { width: 1440, height: 900 },
        },
        username,
        password,
        consoleErrors,
        pageErrors,
        captureFullPage,
        waitForCatalogReadyState,
        loginFromCatalog,
        readSessionToken,
        createTemporaryViewerFixture,
        deleteTemporaryViewerFixture,
        waitForHeading,
        capturePage,
        isIgnorableConsoleError,
      });

      await captureViewportSuite({
        browser,
        baseUrl,
        outputDir,
        tag,
        viewportName: "mobile",
        contextOptions: {
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
        },
        username,
        password,
        consoleErrors,
        pageErrors,
        captureFullPage,
        waitForCatalogReadyState,
        loginFromCatalog,
        readSessionToken,
        createTemporaryViewerFixture,
        deleteTemporaryViewerFixture,
        waitForHeading,
        capturePage,
        isIgnorableConsoleError,
      });
    } finally {
      await browser.close();
    }

    if (consoleErrors.length || pageErrors.length) {
      const chunks = [];
      if (consoleErrors.length) chunks.push(`console errors:\n- ${consoleErrors.join("\n- ")}`);
      if (pageErrors.length) chunks.push(`page errors:\n- ${pageErrors.join("\n- ")}`);
      throw new Error(chunks.join("\n"));
    }

    const files = fs.readdirSync(outputDir)
      .filter((name) => name.startsWith(`${tag}-`) && name.endsWith(".png"))
      .sort();

    console.log(JSON.stringify({
      ok: true,
      tag,
      baseUrl,
      outputDir,
      files,
      logPath,
    }, null, 2));
  } finally {
    await stopServer(server);
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  CATALOG_READY_SELECTORS,
  TEMP_VIEWER_FIXTURE_HTML,
  createTemporaryViewerFixture,
  deleteTemporaryViewerFixture,
  parseTagArg,
  run,
  waitForCatalogReadyState,
};
