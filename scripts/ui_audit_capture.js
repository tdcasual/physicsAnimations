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

  await page.getByRole("link", { name: "管理" }).waitFor({ state: "visible", timeout: 10000 });
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
    await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-catalog-auth.png`), {
      fullPage: captureFullPage,
    });

    await captureAdminScreens(page, outputDir, tag, viewportName, captureFullPage);
  } finally {
    await context.close();
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
  parseTagArg,
  run,
  waitForCatalogReadyState,
};
