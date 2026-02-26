const test = require("node:test");
const assert = require("node:assert/strict");

test("createUploadIngestService exposes createLinkItem and createUploadItem", async () => {
  const { createUploadIngestService } = require("../server/services/items/uploadIngestService");

  const service = createUploadIngestService({
    rootDir: process.cwd(),
    store: {},
    deps: {
      mutateItemsState: async () => null,
      normalizeCategoryId: (value) => String(value || "other"),
      warnScreenshotDeps: () => {},
    },
  });

  assert.equal(typeof createUploadIngestService, "function");
  assert.equal(typeof service.createLinkItem, "function");
  assert.equal(typeof service.createUploadItem, "function");
});

