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

test("syncWithWebdav skips local sqlite cache files under content/", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-sync-sqlite-skip-"));
  const contentDir = path.join(rootDir, "content");
  fs.mkdirSync(path.join(contentDir, "uploads", "u_demo"), { recursive: true });
  fs.writeFileSync(path.join(contentDir, "uploads", "u_demo", "index.html"), "<html></html>", "utf8");
  fs.writeFileSync(path.join(contentDir, "state.sqlite"), "sqlite-main", "utf8");
  fs.writeFileSync(path.join(contentDir, "state.sqlite-wal"), "sqlite-wal", "utf8");
  fs.writeFileSync(path.join(contentDir, "state.sqlite-shm"), "sqlite-shm", "utf8");

  const uploadedKeys = [];
  const loader = loadWebdavSyncWithMockedStore({
    async readBuffer() {
      return null;
    },
    async writeBuffer(key) {
      uploadedKeys.push(String(key || ""));
    },
    async listDir() {
      return [];
    },
  });

  try {
    await loader.syncWithWebdav({
      rootDir,
      webdavConfig: {},
      scanRemote: false,
    });

    assert.equal(uploadedKeys.includes("state.sqlite"), false);
    assert.equal(uploadedKeys.includes("state.sqlite-wal"), false);
    assert.equal(uploadedKeys.includes("state.sqlite-shm"), false);
    assert.equal(uploadedKeys.includes("uploads/u_demo/index.html"), true);
  } finally {
    loader.restore();
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
