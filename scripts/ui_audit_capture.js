#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("../server/lib/playwrightEnv");
const { ensureSpaDistFresh } = require("./lib/ensure_spa_dist_fresh");
const { findOpenPort, startServer, stopServer, waitForHealth } = require("./lib/smoke_runtime");

const CATALOG_READY_SELECTORS = [
  ".catalog-search",
  ".catalog-empty",
  ".catalog-state",
];

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

async function waitForCatalogReadyState(page, timeoutMs = 10000) {
  const perSelectorTimeout = Math.max(250, Math.floor(timeoutMs / CATALOG_READY_SELECTORS.length));
  const failures = [];

  for (const selector of CATALOG_READY_SELECTORS) {
    try {
      await page.locator(selector).first().waitFor({ state: "visible", timeout: perSelectorTimeout });
      return selector;
    } catch (error) {
      failures.push(`${selector}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(`catalog ready state timeout: ${failures.join(" | ")}`);
}

async function loginFromCatalog(page, username, password) {
  await page.goto("/", { waitUntil: "networkidle" });
  const loginButton = page.getByRole("banner").getByRole("button", { name: "登录" });
  await loginButton.waitFor({ state: "visible", timeout: 10000 });
  await loginButton.click();

  const dialog = page.getByRole("dialog", { name: "管理员登录" });
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  await dialog.getByRole("textbox", { name: "用户名" }).fill(username);
  await dialog.getByRole("textbox", { name: "密码" }).fill(password);
  await dialog.getByRole("button", { name: "登录" }).click();

  await Promise.any([
    page.waitForURL((url) => url.pathname.startsWith("/admin"), { timeout: 10000 }),
    page.getByRole("link", { name: "管理" }).waitFor({ state: "visible", timeout: 10000 }),
    page.getByRole("button", { name: "退出" }).waitFor({ state: "visible", timeout: 10000 }),
  ]);
}

async function readSessionToken(page) {
  return page.evaluate(() => sessionStorage.getItem("pa_admin_token") || "");
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

async function captureViewerScreen(page, outputDir, tag, viewportName, captureFullPage, fixtureId) {
  await page.goto(`/viewer/${encodeURIComponent(fixtureId)}`, { waitUntil: "networkidle" });
  await page.locator(".viewer-bar").first().waitFor({ state: "visible", timeout: 10000 });
  await page.locator(".viewer-stage-frame").first().waitFor({ state: "visible", timeout: 10000 });
  await page.locator(".viewer-frame, .viewer-shot").first().waitFor({ state: "visible", timeout: 10000 });
  await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-viewer.png`), {
    fullPage: captureFullPage,
  });
}

async function captureAdminScreens(page, dir, tag, viewportName, captureFullPage) {
  const routes = [
    { slug: "admin-dashboard", pathName: "/admin/dashboard", heading: "概览" },
    { slug: "admin-content", pathName: "/admin/content", heading: "内容管理" },
    { slug: "admin-uploads", pathName: "/admin/uploads", heading: "上传管理" },
    { slug: "admin-library", pathName: "/admin/library", heading: "资源库管理" },
    { slug: "admin-taxonomy", pathName: "/admin/taxonomy", heading: "分类管理" },
    { slug: "admin-account", pathName: "/admin/account", heading: "账号设置" },
  ];

  for (const route of routes) {
    await page.goto(route.pathName, { waitUntil: "networkidle" });
    await waitForHeading(page, route.heading);
    await capturePage(page, path.join(dir, `${tag}-${viewportName}-${route.slug}.png`), {
      fullPage: captureFullPage,
    });
  }

  await page.goto("/admin/system", { waitUntil: "networkidle" });
  await waitForHeading(page, "系统设置向导");
  await capturePage(page, path.join(dir, `${tag}-${viewportName}-admin-system-step1.png`), {
    fullPage: captureFullPage,
  });

  const stepTitles = [
    "2. 连接配置",
    "3. 校验与保存",
    "4. 启用同步",
  ];
  for (const [index, title] of stepTitles.entries()) {
    await page.getByRole("button", { name: title }).click();
    const step = index + 2;
    await page.waitForTimeout(200);
    await capturePage(page, path.join(dir, `${tag}-${viewportName}-admin-system-step${step}.png`), {
      fullPage: captureFullPage,
    });
  }
}

async function captureViewportSuite({
  browser,
  baseUrl,
  outputDir,
  tag,
  viewportName,
  contextOptions,
  username,
  password,
  consoleErrors,
  pageErrors,
  captureFullPage,
}) {
  const context = await browser.newContext({
    baseURL: baseUrl,
    ...contextOptions,
  });
  let temporaryViewerFixtureId = "";
  let authToken = "";

  try {
    const page = await context.newPage();

    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      const locationUrl = message.location()?.url || "";
      if (isIgnorableConsoleError(text, locationUrl)) return;
      consoleErrors.push(`[${viewportName}] ${text}${locationUrl ? ` @ ${locationUrl}` : ""}`);
    });

    page.on("pageerror", (error) => {
      pageErrors.push(`[${viewportName}] ${error?.message || String(error)}`);
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await waitForCatalogReadyState(page);
    await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-catalog.png`), {
      fullPage: captureFullPage,
    });

    await page.getByRole("banner").getByRole("button", { name: "登录" }).click();
    await page.getByRole("dialog", { name: "管理员登录" }).waitFor({ state: "visible", timeout: 10000 });
    await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-login-modal.png`), { fullPage: false });

    await page.goto("/login", { waitUntil: "networkidle" });
    await waitForHeading(page, "管理员登录");
    await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-login-page.png`), { fullPage: false });

    await loginFromCatalog(page, username, password);
    authToken = await readSessionToken(page);
    if (!authToken) {
      throw new Error("missing admin session token after login");
    }
    await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-catalog-auth.png`), {
      fullPage: captureFullPage,
    });

    const temporaryViewerFixture = await createTemporaryViewerFixture(context, authToken);
    temporaryViewerFixtureId = temporaryViewerFixture.id;
    await captureViewerScreen(page, outputDir, tag, viewportName, captureFullPage, temporaryViewerFixture.id);

    await captureAdminScreens(page, outputDir, tag, viewportName, captureFullPage);
  } finally {
    try {
      if (temporaryViewerFixtureId && authToken) {
        await deleteTemporaryViewerFixture(context, authToken, temporaryViewerFixtureId);
      }
    } finally {
      await context.close();
    }
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
