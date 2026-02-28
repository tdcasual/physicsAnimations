const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveScreenshotNavigationOptions } = require("../server/lib/screenshot");

test("resolveScreenshotNavigationOptions uses load wait for file urls", () => {
  const options = resolveScreenshotNavigationOptions("file:///tmp/index.html");
  assert.deepEqual(options, {
    waitUntil: "load",
    timeout: 5000,
  });
});

test("resolveScreenshotNavigationOptions uses networkidle for web urls", () => {
  const options = resolveScreenshotNavigationOptions("https://example.com/demo");
  assert.deepEqual(options, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
});

test("resolveScreenshotNavigationOptions supports timeout overrides", () => {
  const fileOptions = resolveScreenshotNavigationOptions("file:///tmp/index.html", {
    PA_SCREENSHOT_FILE_TIMEOUT_MS: "1200",
  });
  assert.equal(fileOptions.timeout, 1200);

  const webOptions = resolveScreenshotNavigationOptions("https://example.com/demo", {
    PA_SCREENSHOT_TIMEOUT_MS: "15000",
  });
  assert.equal(webOptions.timeout, 15000);
});
