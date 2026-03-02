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

test("syncWithWebdav should not re-upload stale local state files after merged state write", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-sync-state-guard-"));
  const contentDir = path.join(rootDir, "content");
  fs.mkdirSync(path.join(contentDir, "uploads", "u_demo"), { recursive: true });
  fs.writeFileSync(path.join(contentDir, "uploads", "u_demo", "index.html"), "<html>ok</html>", "utf8");

  const staleLocalItems = {
    version: 2,
    items: [
      {
        id: "u_same",
        type: "upload",
        categoryId: "other",
        path: "content/uploads/u_same/index.html",
        title: "Local Old",
        description: "",
        thumbnail: "",
        order: 0,
        published: true,
        hidden: false,
        uploadKind: "html",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
  const localItemsPath = path.join(contentDir, "items.json");
  fs.writeFileSync(localItemsPath, `${JSON.stringify(staleLocalItems, null, 2)}\n`, "utf8");
  fs.chmodSync(localItemsPath, 0o444);

  const remoteState = new Map();
  remoteState.set(
    "items.json",
    Buffer.from(
      `${JSON.stringify(
        {
          version: 2,
          items: [
            {
              id: "u_same",
              type: "upload",
              categoryId: "other",
              path: "content/uploads/u_same/index.html",
              title: "Remote New",
              description: "",
              thumbnail: "",
              order: 0,
              published: true,
              hidden: false,
              uploadKind: "html",
              createdAt: "2026-02-01T00:00:00.000Z",
              updatedAt: "2026-02-01T00:00:00.000Z",
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    ),
  );

  const writeCalls = [];
  const loader = loadWebdavSyncWithMockedStore({
    async readBuffer(key) {
      return remoteState.get(String(key || "")) || null;
    },
    async writeBuffer(key, buffer) {
      const normalizedKey = String(key || "");
      const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
      writeCalls.push(normalizedKey);
      remoteState.set(normalizedKey, buf);
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

    const itemWriteCount = writeCalls.filter((key) => key === "items.json").length;
    assert.equal(itemWriteCount, 1, `unexpected write calls: ${JSON.stringify(writeCalls)}`);

    const finalItems = JSON.parse(remoteState.get("items.json").toString("utf8"));
    assert.equal(Array.isArray(finalItems.items), true);
    assert.equal(finalItems.items.length, 1);
    assert.equal(finalItems.items[0].id, "u_same");
    assert.equal(finalItems.items[0].title, "Remote New");
  } finally {
    loader.restore();
    fs.chmodSync(localItemsPath, 0o644);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
