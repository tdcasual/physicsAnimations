const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function loadWebdavSyncWithMockedStore(webdavStore) {
  const contentStorePath = require.resolve("../server/lib/contentStore");
  const webdavSyncPath = require.resolve("../server/lib/webdavSync");
  const contentStoreOriginal = require(contentStorePath);

  require.cache[contentStorePath].exports = {
    ...contentStoreOriginal,
    createWebdavStore() {
      return webdavStore;
    },
  };
  delete require.cache[webdavSyncPath];
  const webdavSyncModule = require(webdavSyncPath);

  return {
    syncWithWebdav: webdavSyncModule.syncWithWebdav,
    restore() {
      require.cache[contentStorePath].exports = contentStoreOriginal;
      delete require.cache[webdavSyncPath];
    },
  };
}

test("syncWithWebdav falls back to cwd when rootDir is omitted", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-webdav-rootdir-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  const previousCwd = process.cwd();
  process.chdir(rootDir);

  const written = new Map();
  const loader = loadWebdavSyncWithMockedStore({
    async readBuffer() {
      return null;
    },
    async writeBuffer(key, buffer) {
      written.set(String(key || ""), Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || ""));
    },
    async listDir() {
      return [];
    },
  });

  try {
    const result = await loader.syncWithWebdav({ webdavConfig: {}, scanRemote: false });
    assert.equal(result.scan.enabled, false);
    assert.equal(result.uploaded, 0);
    assert.equal(result.skipped, 4);
    assert.equal(written.has("items.json"), true);
    assert.equal(written.has("categories.json"), true);
    assert.equal(written.has("builtin_items.json"), true);
    assert.equal(written.has("items_tombstones.json"), true);
  } finally {
    loader.restore();
    process.chdir(previousCwd);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
