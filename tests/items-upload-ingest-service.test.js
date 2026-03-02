const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

function loadUploadIngestServiceWithMocks({ captureScreenshotQueued, assertPublicHttpUrl }) {
  const screenshotPath = require.resolve("../server/lib/screenshot");
  const ssrfPath = require.resolve("../server/lib/ssrf");
  const uploadIngestPath = require.resolve("../server/services/items/uploadIngestService");

  const screenshotOriginal = require(screenshotPath);
  const ssrfOriginal = require(ssrfPath);

  require.cache[screenshotPath].exports = {
    ...screenshotOriginal,
    captureScreenshotQueued,
  };
  require.cache[ssrfPath].exports = {
    ...ssrfOriginal,
    assertPublicHttpUrl,
  };

  delete require.cache[uploadIngestPath];
  const uploadIngestModule = require(uploadIngestPath);

  return {
    createUploadIngestService: uploadIngestModule.createUploadIngestService,
    restore() {
      require.cache[screenshotPath].exports = screenshotOriginal;
      require.cache[ssrfPath].exports = ssrfOriginal;
      delete require.cache[uploadIngestPath];
    },
  };
}

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

test("createLinkItem cleans up thumbnail when state persistence fails", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-link-cleanup-"));
  const deleteCalls = [];
  const writeCalls = [];

  const loader = loadUploadIngestServiceWithMocks({
    async captureScreenshotQueued({ outputPath }) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, Buffer.from("png", "utf8"));
    },
    async assertPublicHttpUrl(value) {
      return new URL(value);
    },
  });

  try {
    const service = loader.createUploadIngestService({
      rootDir,
      store: {
        async writeBuffer(key) {
          writeCalls.push(key);
        },
        async deletePath(key) {
          deleteCalls.push(key);
        },
      },
      deps: {
        mutateItemsState: async () => {
          throw new Error("state_write_failed");
        },
        normalizeCategoryId: (value) => String(value || "other"),
        warnScreenshotDeps: () => {},
      },
    });

    await assert.rejects(
      () =>
        service.createLinkItem({
          url: "https://example.com/",
          title: "Example",
          description: "desc",
          categoryId: "other",
        }),
      (err) => err && err.message === "state_write_failed",
    );

    assert.equal(writeCalls.length, 1);
    assert.equal(deleteCalls.length, 1);
    assert.equal(deleteCalls[0], writeCalls[0]);
  } finally {
    loader.restore();
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
