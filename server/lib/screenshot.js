const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const { chromium } = require("playwright-chromium");
const { enqueueScreenshot } = require("./screenshotQueue");
const { buildPlaywrightEnv } = require("./playwrightEnv");
const { shouldAllowRequestUrl } = require("./ssrf");

const DEFAULT_SCREENSHOT_TIMEOUT_MS = 30000;
const DEFAULT_SCREENSHOT_FILE_TIMEOUT_MS = 5000;

function parsePositiveTimeout(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveScreenshotNavigationOptions(targetUrl, env = process.env) {
  const url = String(targetUrl || "");
  const isFileUrl = url.startsWith("file:");
  const webTimeout =
    parsePositiveTimeout(env.PA_SCREENSHOT_TIMEOUT_MS) || DEFAULT_SCREENSHOT_TIMEOUT_MS;
  const fileTimeout =
    parsePositiveTimeout(env.PA_SCREENSHOT_FILE_TIMEOUT_MS) ||
    DEFAULT_SCREENSHOT_FILE_TIMEOUT_MS;

  return {
    waitUntil: isFileUrl ? "load" : "networkidle",
    timeout: isFileUrl ? fileTimeout : webTimeout,
  };
}

function fileUrlPath(url) {
  try {
    if (!(url instanceof URL)) return "";
    if (url.protocol !== "file:") return "";
    return decodeURIComponent(url.pathname || "");
  } catch {
    return "";
  }
}

function parseUrl(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

async function captureScreenshot({ rootDir, targetUrl, outputPath, allowedFileRoot }) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    env: rootDir ? buildPlaywrightEnv({ rootDir }) : { ...process.env },
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const hostnameCache = new Map();
    const mainTarget = parseUrl(targetUrl);
    const blockHttpRequests = mainTarget?.protocol === "file:";

    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      const parsedRequestUrl = parseUrl(requestUrl);

      if (
        blockHttpRequests &&
        parsedRequestUrl &&
        (parsedRequestUrl.protocol === "http:" || parsedRequestUrl.protocol === "https:")
      ) {
        await route.abort();
        return;
      }

      let ok = await shouldAllowRequestUrl(requestUrl, hostnameCache);

      if (ok && allowedFileRoot) {
        if (parsedRequestUrl?.protocol === "file:") {
          const requestedPath = fileUrlPath(parsedRequestUrl);
          const root = path.resolve(String(allowedFileRoot));
          const full = path.resolve(requestedPath);
          ok = full === root || full.startsWith(`${root}${path.sep}`);
        }
      }
      if (!ok) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.goto(targetUrl, resolveScreenshotNavigationOptions(targetUrl));
    await page.waitForTimeout(800);
    await page.screenshot({ path: outputPath });

    await page.close();
    await context.close();
  } finally {
    await browser.close();
  }
}

async function captureScreenshotQueued(options) {
  return enqueueScreenshot(() => captureScreenshot(options));
}

function filePathToUrl(filePath) {
  return pathToFileURL(filePath).toString();
}

module.exports = {
  captureScreenshot,
  captureScreenshotQueued,
  filePathToUrl,
  resolveScreenshotNavigationOptions,
};
