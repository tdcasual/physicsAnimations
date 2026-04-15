#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("../server/lib/playwrightEnv");
const logger = require("../server/lib/logger");
const { waitForCatalogReadyState } = require("./lib/catalog_ready_state");
const { ensureSpaDistFresh } = require("./lib/ensure_spa_dist_fresh");
const { findOpenPort, waitForHealth, startServer, stopServer } = require("./lib/smoke_runtime");

function isIgnorableConsoleError(text, locationUrl) {
  const value = String(text || "");
  const url = String(locationUrl || "");
  if (!value && !url) return false;
  if (value.includes("favicon.ico")) return true;
  return false;
}

async function loginAdmin(baseUrl, username, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.token) {
    throw new Error(`admin login failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return String(data.token);
}

async function getFirstPublicCategory(baseUrl, token) {
  const response = await fetch(`${baseUrl}/api/categories`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`load categories failed: ${response.status} ${JSON.stringify(data)}`);
  }
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  const categories = Array.isArray(data?.categories) ? data.categories : [];

  const sortedGroups = [...groups].sort((a, b) => {
    const orderDiff = Number(b?.order || 0) - Number(a?.order || 0);
    if (orderDiff) return orderDiff;
    return String(a?.title || "").localeCompare(String(b?.title || ""), "zh-CN");
  });

  for (const group of sortedGroups) {
    if (group?.hidden === true) continue;
    const groupCategories = categories
      .filter((row) => row?.groupId === group.id && row?.hidden !== true)
      .sort((a, b) => {
        const orderDiff = Number(b?.order || 0) - Number(a?.order || 0);
        if (orderDiff) return orderDiff;
        return String(a?.title || "").localeCompare(String(b?.title || ""), "zh-CN");
      });

    if (groupCategories.length) {
      return {
        categoryId: String(groupCategories[0].id),
      };
    }
  }

  return { categoryId: "other" };
}

async function createPublicUploadItem({
  baseUrl,
  token,
  categoryId,
  title,
  description,
  html,
  fileName,
}) {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([String(html || "")], { type: "text/html; charset=utf-8" }),
    fileName || "smoke-public.html",
  );
  formData.append("categoryId", String(categoryId || "other"));
  formData.append("title", String(title || ""));
  formData.append("description", String(description || ""));

  const response = await fetch(`${baseUrl}/api/items`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.id) {
    throw new Error(`create upload item failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function findItemGroupMeta(baseUrl, itemId) {
  const response = await fetch(`${baseUrl}/api/catalog`, { method: "GET", cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`load catalog failed: ${response.status} ${JSON.stringify(data)}`);
  }

  const groupsObj = data?.groups && typeof data.groups === "object" ? data.groups : {};
  for (const group of Object.values(groupsObj)) {
    const categoriesObj = group?.categories && typeof group.categories === "object" ? group.categories : {};
    for (const category of Object.values(categoriesObj)) {
      const items = Array.isArray(category?.items) ? category.items : [];
      if (items.some((item) => String(item?.id || "") === itemId)) {
        return {
          groupTitle: String(group?.title || group?.id || ""),
        };
      }
    }
  }
  return null;
}

async function loadItemById({ baseUrl, token, id }) {
  const response = await fetch(`${baseUrl}/api/items/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.item) {
    throw new Error(`load item failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data.item;
}

function normalizeExpectedTarget(raw) {
  const target = String(raw || "").trim();
  if (!target) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return target;
  if (target.startsWith("//")) return target;
  if (target.startsWith("/")) return target;
  return `/${target.replace(/^\.?\//, "")}`;
}

function toViewerFrameExpectedTarget(raw) {
  const target = normalizeExpectedTarget(raw);
  if (target.startsWith("/content/uploads/")) {
    return `/content/isolated${target.slice("/content".length)}`;
  }
  return target;
}

function toViewerOpenExpectedTarget(raw) {
  return normalizeExpectedTarget(raw);
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

async function chooseGroup(page, groupTitle) {
  const groupTabs = page.locator(".cat-group-tabs").first();
  await groupTabs.waitFor({ state: "visible", timeout: 10000 });

  const directTab = groupTabs.getByRole("button", { name: groupTitle }).first();
  if ((await directTab.count()) > 0) {
    await directTab.click();
    return;
  }

  const groupSelect = groupTabs.locator("select");
  if ((await groupSelect.count()) > 0) {
    await groupSelect.selectOption({ label: groupTitle });
    return;
  }

  throw new Error(`cannot select group: ${groupTitle}`);
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
  const logPath = path.join(outputDir, "spa-public-smoke-server.log");
  const screenshotCatalogPath = path.join(outputDir, "spa-public-smoke-catalog.png");
  const screenshotViewerPath = path.join(outputDir, "spa-public-smoke-viewer.png");

  const server = startServer(rootDir, port, logPath);
  const consoleErrors = [];
  const pageErrors = [];
  let createdId = "";
  let authToken = "";

  try {
    await waitForHealth(baseUrl);

    authToken = await loginAdmin(baseUrl, username, password);
    const { categoryId } = await getFirstPublicCategory(baseUrl, authToken);
    const smokeToken = `spa-public-${Date.now()}`;
    const smokeTitle = `Smoke Upload ${smokeToken}`;
    const smokeDescription = `公开页冒烟校验 ${smokeToken}`;
    const smokeHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${smokeTitle}</title></head><body><h1>${smokeTitle}</h1><p>${smokeDescription}</p></body></html>`;

    const created = await createPublicUploadItem({
      baseUrl,
      token: authToken,
      categoryId,
      title: smokeTitle,
      description: smokeDescription,
      html: smokeHtml,
      fileName: `${smokeToken}.html`,
    });
    createdId = String(created.id);
    const createdItem = await loadItemById({ baseUrl, token: authToken, id: createdId });
    const expectedFrameTarget = toViewerFrameExpectedTarget(createdItem?.src || "");
    const expectedOpenTarget = toViewerOpenExpectedTarget(createdItem?.src || "");
    if (!expectedFrameTarget || !expectedOpenTarget) throw new Error("created upload item missing src");

    const itemGroupMeta = await findItemGroupMeta(baseUrl, createdId);
    const expectedGroupTitle = itemGroupMeta?.groupTitle || "";

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
        pageErrors.push(message);
      });

      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      await waitForCatalogReadyState(page);
      await page.locator(".cat-group-tabs").first().waitFor({ state: "visible", timeout: 10000 });
      await page.locator(".cat-category-tabs").first().waitFor({ state: "visible", timeout: 10000 });

      if (expectedGroupTitle) {
        await chooseGroup(page, expectedGroupTitle);
      }
      await page.locator(".cat-category-tabs").getByRole("button", { name: "全部" }).click();

      const searchInput = page.locator('input[type="search"]').first();
      await searchInput.fill(smokeTitle);

      const card = page.locator(".cat-card", { hasText: smokeTitle }).first();
      await card.waitFor({ state: "visible", timeout: 10000 });
      await page.screenshot({ path: screenshotCatalogPath, fullPage: false });

      await Promise.all([
        page.waitForURL(new RegExp(`/viewer/${createdId}$`), { timeout: 10000 }),
        card.click(),
      ]);
      const openLink = page.getByRole("link", { name: /原页面|打开原页面/ });
      await openLink.waitFor({ state: "visible", timeout: 10000 });
      await page.getByText(smokeTitle).first().waitFor({ state: "visible", timeout: 10000 });
      const viewerFrame = page.locator('iframe[title="作品"], iframe.viewer-frame').first();
      await viewerFrame.waitFor({ state: "visible", timeout: 10000 });
      const frameSrc = await viewerFrame.getAttribute("src");
      if (frameSrc !== expectedFrameTarget) {
        throw new Error(`viewer frame src mismatch: expected ${expectedFrameTarget}, got ${frameSrc}`);
      }
      const openHref = await openLink.getAttribute("href");
      if (openHref !== expectedOpenTarget) {
        throw new Error(`open link href mismatch: expected ${expectedOpenTarget}, got ${openHref}`);
      }
      await page.screenshot({ path: screenshotViewerPath, fullPage: false });

      await page.goBack({ waitUntil: "networkidle" });
      await waitForCatalogReadyState(page);
      await searchInput.waitFor({ state: "visible", timeout: 10000 });
      const searchAfterReturn = await searchInput.inputValue();
      if (searchAfterReturn !== smokeTitle) {
        throw new Error(`catalog search lost context after viewer return: expected ${smokeTitle}, got ${searchAfterReturn}`);
      }
    } finally {
      await browser.close();
    }

    if (consoleErrors.length || pageErrors.length) {
      const parts = [];
      if (consoleErrors.length) parts.push(`console errors:\n- ${consoleErrors.join("\n- ")}`);
      if (pageErrors.length) parts.push(`page errors:\n- ${pageErrors.join("\n- ")}`);
      throw new Error(parts.join("\n"));
    }

    logger.info("smoke_public_pass", {
      baseUrl,
      screenshotCatalogPath,
      screenshotViewerPath,
      logPath,
    });
  } finally {
    await cleanupCreatedItem({ baseUrl, token: authToken, id: createdId }).catch((error) => {
      logger.error("smoke_public_cleanup_failed", error, { itemId: createdId || null });
      process.exitCode = 1;
    });
    await stopServer(server);
  }
}

if (require.main === module) {
  run().catch((err) => {
    logger.error("smoke_public_failed", err);
    process.exitCode = 1;
  });
}

module.exports = {
  run,
};
