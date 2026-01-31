const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const { chromium } = require("playwright-chromium");
const { enqueueScreenshot } = require("./screenshotQueue");
const { buildPlaywrightEnv } = require("./playwrightEnv");
const { shouldAllowRequestUrl } = require("./ssrf");

function fileUrlPath(url) {
  try {
    if (!(url instanceof URL)) return "";
    if (url.protocol !== "file:") return "";
    return decodeURIComponent(url.pathname || "");
  } catch {
    return "";
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

    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      let ok = await shouldAllowRequestUrl(requestUrl, hostnameCache);

      if (ok && allowedFileRoot) {
        let parsed = null;
        try {
          parsed = new URL(requestUrl);
        } catch {
          parsed = null;
        }

        if (parsed?.protocol === "file:") {
          const requestedPath = fileUrlPath(parsed);
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

    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
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
};
