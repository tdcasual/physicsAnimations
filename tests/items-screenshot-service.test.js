const test = require("node:test");
const assert = require("node:assert/strict");

test("createScreenshotService exposes runScreenshotTask", async () => {
  const { createScreenshotService } = require("../server/services/items/screenshotService");

  const service = createScreenshotService({
    rootDir: process.cwd(),
    store: {},
    deps: {
      mutateItemsState: async () => null,
      noSave: (value) => ({ value }),
      captureScreenshotQueued: async () => null,
      filePathToUrl: (value) => String(value || ""),
      assertPublicHttpUrl: async (value) => new URL(String(value || "https://example.com")),
    },
  });

  assert.equal(typeof createScreenshotService, "function");
  assert.equal(typeof service.runScreenshotTask, "function");
});

