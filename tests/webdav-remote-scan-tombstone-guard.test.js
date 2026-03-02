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

test("syncWithWebdav scanRemote does not resurrect tombstoned uploads", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-webdav-tombstone-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });

  const written = new Map();
  const loader = loadWebdavSyncWithMockedStore({
    async readBuffer(key) {
      const normalized = String(key || "");
      if (normalized === "items.json") {
        return Buffer.from(JSON.stringify({ version: 2, items: [] }), "utf8");
      }
      if (normalized === "categories.json") {
        return Buffer.from(JSON.stringify({ version: 2, groups: {}, categories: {} }), "utf8");
      }
      if (normalized === "items_tombstones.json") {
        return Buffer.from(
          JSON.stringify({
            version: 1,
            tombstones: {
              u_deleted: { deletedAt: "2026-02-01T00:00:00.000Z" },
            },
          }),
          "utf8",
        );
      }
      if (normalized === "uploads/u_deleted/manifest.json") {
        return Buffer.from(
          JSON.stringify({
            version: 1,
            id: "u_deleted",
            entry: "index.html",
            files: ["index.html"],
            createdAt: "2026-01-01T00:00:00.000Z",
          }),
          "utf8",
        );
      }
      if (normalized === "uploads/u_deleted/index.html") {
        return Buffer.from("<html><head><title>Deleted</title></head><body></body></html>", "utf8");
      }
      return null;
    },
    async writeBuffer(key, buffer) {
      written.set(String(key || ""), Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || ""));
    },
    async listDir(dirKey) {
      if (String(dirKey || "") === "uploads") {
        return [{ name: "u_deleted", isDir: true }];
      }
      return [];
    },
  });

  try {
    await loader.syncWithWebdav({
      rootDir,
      webdavConfig: {},
      scanRemote: true,
    });

    const itemsState = JSON.parse(String(written.get("items.json") || "{}"));
    const tombState = JSON.parse(String(written.get("items_tombstones.json") || "{}"));

    assert.equal(Array.isArray(itemsState.items), true);
    assert.equal(itemsState.items.some((item) => item.id === "u_deleted"), false);
    assert.equal(Boolean(tombState.tombstones?.u_deleted), true);
  } finally {
    loader.restore();
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
