const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("./playwrightEnv");

async function captureScreenshot({ rootDir, targetUrl, outputPath }) {
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

    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: outputPath });

    await page.close();
    await context.close();
  } finally {
    await browser.close();
  }
}

function filePathToUrl(filePath) {
  return pathToFileURL(filePath).toString();
}

module.exports = {
  captureScreenshot,
  filePathToUrl,
};
