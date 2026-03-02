const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

function loadScreenshotModuleWithMockedPlaywright(setup) {
  const screenshotPath = require.resolve("../server/lib/screenshot");
  const playwrightPath = require.resolve("playwright-chromium");
  const playwrightOriginal = require(playwrightPath);

  require.cache[playwrightPath].exports = {
    chromium: setup.chromium,
  };
  delete require.cache[screenshotPath];
  const screenshotModule = require(screenshotPath);

  return {
    screenshotModule,
    restore() {
      require.cache[playwrightPath].exports = playwrightOriginal;
      delete require.cache[screenshotPath];
    },
  };
}

function createMockedChromium(onRoute) {
  let routeHandler = null;

  const page = {
    async route(_pattern, handler) {
      routeHandler = handler;
    },
    async goto(_url) {
      await onRoute(async (requestUrl) => {
        let action = "";
        const route = {
          request() {
            return {
              url() {
                return requestUrl;
              },
            };
          },
          async abort() {
            action = "aborted";
          },
          async continue() {
            action = "continued";
          },
        };
        if (!routeHandler) throw new Error("route_handler_missing");
        await routeHandler(route);
        return action;
      });
    },
    async waitForTimeout() {},
    async screenshot() {},
    async close() {},
  };

  const context = {
    async newPage() {
      return page;
    },
    async close() {},
  };

  const browser = {
    async newContext() {
      return context;
    },
    async close() {},
  };

  return {
    chromium: {
      async launch() {
        return browser;
      },
    },
  };
}

test("captureScreenshot blocks file subrequests when allowedFileRoot is missing", async () => {
  let requestDecision = "";

  const loader = loadScreenshotModuleWithMockedPlaywright(
    createMockedChromium(async (dispatch) => {
      const result = await dispatch("file:///etc/passwd");
      requestDecision = result;
    }),
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-guard-"));
  try {
    const { captureScreenshot } = loader.screenshotModule;
    await captureScreenshot({
      rootDir: process.cwd(),
      targetUrl: "https://example.com/",
      outputPath: path.join(tmpDir, "shot.png"),
    });

    assert.equal(requestDecision, "aborted");
  } finally {
    loader.restore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("captureScreenshot allows file subrequests under allowedFileRoot", async () => {
  let requestDecision = "";
  const allowedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-allowed-"));
  const nested = path.join(allowedRoot, "assets", "main.js");

  const loader = loadScreenshotModuleWithMockedPlaywright(
    createMockedChromium(async (dispatch) => {
      const result = await dispatch(pathToFileURL(nested).toString());
      requestDecision = result;
    }),
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-guard-"));
  try {
    const { captureScreenshot } = loader.screenshotModule;
    await captureScreenshot({
      rootDir: process.cwd(),
      targetUrl: "file:///tmp/index.html",
      outputPath: path.join(tmpDir, "shot.png"),
      allowedFileRoot: allowedRoot,
    });

    assert.equal(requestDecision, "continued");
  } finally {
    loader.restore();
    fs.rmSync(allowedRoot, { recursive: true, force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
