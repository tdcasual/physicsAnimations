const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function loadStateDbWithMockedMirror(mirror) {
  const sqliteMirrorPath = require.resolve("../server/lib/stateDb/sqliteMirror");
  const stateDbPath = require.resolve("../server/lib/stateDb");
  const storeFactoryPath = require.resolve("../server/lib/stateDb/storeFactory");
  const sqliteMirrorOriginal = require(sqliteMirrorPath);

  require.cache[sqliteMirrorPath].exports = {
    ...sqliteMirrorOriginal,
    createSqliteMirror() {
      return mirror;
    },
  };
  delete require.cache[storeFactoryPath];
  delete require.cache[stateDbPath];
  const stateDbModule = require(stateDbPath);

  return {
    createStateDbStore: stateDbModule.createStateDbStore,
    restore() {
      require.cache[sqliteMirrorPath].exports = sqliteMirrorOriginal;
      delete require.cache[storeFactoryPath];
      delete require.cache[stateDbPath];
    },
  };
}

function makeItemsBuffer(itemId) {
  return Buffer.from(
    `${JSON.stringify({
      version: 2,
      items: [
        {
          id: itemId,
          type: "link",
          categoryId: "other",
          title: itemId,
          description: "",
          url: `https://example.com/${itemId}`,
          path: "",
          thumbnail: "",
          order: 0,
          published: true,
          hidden: false,
          uploadKind: "html",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ],
    })}\n`,
    "utf8",
  );
}

test("stateDb queryItems should not serve stale mirror items after write-through failure", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-state-db-stale-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "animations.json"), "{}\n", "utf8");

  const staleItems = makeItemsBuffer("stale");
  const freshItems = makeItemsBuffer("fresh");
  const blobs = new Map([
    ["items.json", staleItems],
  ]);

  const indexed = { items: [] };
  const mirrorCache = new Map([["items.json", staleItems]]);
  const mirror = {
    dbPath: path.join(rootDir, "content", "state.sqlite"),
    readBuffer(key) {
      return mirrorCache.get(String(key || "")) || null;
    },
    writeBuffer(key, buffer) {
      if (String(key || "") === "items.json") {
        throw new Error("mirror_write_failed");
      }
      mirrorCache.set(String(key || ""), Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || ""));
    },
    deletePath(key) {
      mirrorCache.delete(String(key || ""));
    },
    syncDynamicItemsFromBuffer(buffer) {
      let parsed = null;
      try {
        parsed = JSON.parse(Buffer.from(buffer).toString("utf8"));
      } catch {
        parsed = null;
      }
      indexed.items = Array.isArray(parsed?.items) ? parsed.items : [];
    },
    syncBuiltinItems() {},
    clearDynamicItems() {
      indexed.items = [];
    },
    clearBuiltinItems() {},
    queryDynamicItems() {
      return { total: indexed.items.length, items: indexed.items.slice() };
    },
    queryDynamicItemsForCatalog() {
      return { items: indexed.items.slice() };
    },
    queryDynamicItemById({ id }) {
      return indexed.items.find((item) => item.id === id) || null;
    },
    queryBuiltinItemById() {
      return null;
    },
    queryBuiltinItems() {
      return { total: 0, items: [] };
    },
    queryItems() {
      return { total: indexed.items.length, items: indexed.items.slice() };
    },
    queryDynamicCategoryCounts() {
      return { byCategory: {} };
    },
  };

  const loader = loadStateDbWithMockedMirror(mirror);

  try {
    const wrapped = loader.createStateDbStore({
      rootDir,
      store: {
        mode: "local",
        readOnly: false,
        async readBuffer(key) {
          return blobs.get(String(key || "")) || null;
        },
        async writeBuffer(key, buffer) {
          blobs.set(String(key || ""), Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || ""));
        },
        async deletePath(key) {
          blobs.delete(String(key || ""));
        },
        async createReadStream() {
          return null;
        },
      },
      mode: "sqlite",
    });

    await wrapped.store.writeBuffer("items.json", freshItems);

    const out = await wrapped.store.stateDbQuery.queryItems({
      isAdmin: true,
      includeDeleted: true,
      q: "",
      categoryId: "",
      type: "",
      offset: 0,
      limit: 50,
    });

    assert.equal(out.items[0]?.id, "fresh");
  } finally {
    loader.restore();
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("stateDb queryItems should not resurrect stale mirror cache when source items.json is missing", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-state-db-missing-source-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "animations.json"), "{}\n", "utf8");

  const staleItems = makeItemsBuffer("ghost");
  const indexed = { items: [] };
  const mirror = {
    dbPath: path.join(rootDir, "content", "state.sqlite"),
    readBuffer(key) {
      if (String(key || "") === "items.json") return staleItems;
      return null;
    },
    writeBuffer() {},
    deletePath() {},
    syncDynamicItemsFromBuffer(buffer) {
      let parsed = null;
      try {
        parsed = JSON.parse(Buffer.from(buffer).toString("utf8"));
      } catch {
        parsed = null;
      }
      indexed.items = Array.isArray(parsed?.items) ? parsed.items : [];
    },
    syncBuiltinItems() {},
    clearDynamicItems() {
      indexed.items = [];
    },
    clearBuiltinItems() {},
    queryDynamicItems() {
      return { total: indexed.items.length, items: indexed.items.slice() };
    },
    queryDynamicItemsForCatalog() {
      return { items: indexed.items.slice() };
    },
    queryDynamicItemById({ id }) {
      return indexed.items.find((item) => item.id === id) || null;
    },
    queryBuiltinItemById() {
      return null;
    },
    queryBuiltinItems() {
      return { total: 0, items: [] };
    },
    queryItems() {
      return { total: indexed.items.length, items: indexed.items.slice() };
    },
    queryDynamicCategoryCounts() {
      return { byCategory: {} };
    },
  };

  const loader = loadStateDbWithMockedMirror(mirror);

  try {
    const wrapped = loader.createStateDbStore({
      rootDir,
      store: {
        mode: "local",
        readOnly: false,
        async readBuffer() {
          return null;
        },
        async writeBuffer() {},
        async deletePath() {},
        async createReadStream() {
          return null;
        },
      },
      mode: "sqlite",
    });

    const out = await wrapped.store.stateDbQuery.queryItems({
      isAdmin: true,
      includeDeleted: true,
      q: "",
      categoryId: "",
      type: "",
      offset: 0,
      limit: 50,
    });

    assert.equal(out.total, 0);
    assert.equal((out.items || []).length, 0);
  } finally {
    loader.restore();
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("stateDb queryItems should fail instead of clearing index when source items.json read errors and cache is unavailable", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-state-db-source-read-error-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "animations.json"), "{}\n", "utf8");

  let cleared = 0;
  const indexed = { items: [{ id: "stale" }] };
  const mirror = {
    dbPath: path.join(rootDir, "content", "state.sqlite"),
    readBuffer() {
      return null;
    },
    writeBuffer() {},
    deletePath() {},
    syncDynamicItemsFromBuffer(buffer) {
      let parsed = null;
      try {
        parsed = JSON.parse(Buffer.from(buffer).toString("utf8"));
      } catch {
        parsed = null;
      }
      indexed.items = Array.isArray(parsed?.items) ? parsed.items : [];
    },
    syncBuiltinItems() {},
    clearDynamicItems() {
      cleared += 1;
      indexed.items = [];
    },
    clearBuiltinItems() {},
    queryDynamicItems() {
      return { total: indexed.items.length, items: indexed.items.slice() };
    },
    queryDynamicItemsForCatalog() {
      return { items: indexed.items.slice() };
    },
    queryDynamicItemById({ id }) {
      return indexed.items.find((item) => item.id === id) || null;
    },
    queryBuiltinItemById() {
      return null;
    },
    queryBuiltinItems() {
      return { total: 0, items: [] };
    },
    queryItems() {
      return { total: indexed.items.length, items: indexed.items.slice() };
    },
    queryDynamicCategoryCounts() {
      return { byCategory: {} };
    },
  };

  const loader = loadStateDbWithMockedMirror(mirror);

  try {
    const wrapped = loader.createStateDbStore({
      rootDir,
      store: {
        mode: "local",
        readOnly: false,
        async readBuffer(key) {
          if (String(key || "") === "items.json") {
            throw new Error("source_read_failed");
          }
          return null;
        },
        async writeBuffer() {},
        async deletePath() {},
        async createReadStream() {
          return null;
        },
      },
      mode: "sqlite",
    });

    await assert.rejects(
      wrapped.store.stateDbQuery.queryItems({
        isAdmin: true,
        includeDeleted: true,
        q: "",
        categoryId: "",
        type: "",
        offset: 0,
        limit: 50,
      }),
      (err) => err && err.message === "source_read_failed",
    );

    assert.equal(cleared, 0);
  } finally {
    loader.restore();
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("stateDb queryBuiltinItems should fail when builtin source read errors and cache is unavailable", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-state-db-builtin-read-error-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, "animations.json"),
    JSON.stringify(
      {
        other: {
          items: [{ file: "demo.html", title: "Demo" }],
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  let builtinSyncCalls = 0;
  const mirror = {
    dbPath: path.join(rootDir, "content", "state.sqlite"),
    readBuffer() {
      return null;
    },
    writeBuffer() {},
    deletePath() {},
    syncDynamicItemsFromBuffer() {},
    syncBuiltinItems() {
      builtinSyncCalls += 1;
    },
    clearDynamicItems() {},
    clearBuiltinItems() {},
    queryDynamicItems() {
      return { total: 0, items: [] };
    },
    queryDynamicItemsForCatalog() {
      return { items: [] };
    },
    queryDynamicItemById() {
      return null;
    },
    queryBuiltinItemById() {
      return null;
    },
    queryBuiltinItems() {
      return { total: 0, items: [] };
    },
    queryItems() {
      return { total: 0, items: [] };
    },
    queryDynamicCategoryCounts() {
      return { byCategory: {} };
    },
  };

  const loader = loadStateDbWithMockedMirror(mirror);

  try {
    const wrapped = loader.createStateDbStore({
      rootDir,
      store: {
        mode: "local",
        readOnly: false,
        async readBuffer(key) {
          if (String(key || "") === "builtin_items.json") {
            throw new Error("builtin_source_read_failed");
          }
          return null;
        },
        async writeBuffer() {},
        async deletePath() {},
        async createReadStream() {
          return null;
        },
      },
      mode: "sqlite",
    });

    await assert.rejects(
      wrapped.store.stateDbQuery.queryBuiltinItems({
        isAdmin: true,
        includeDeleted: true,
        q: "",
        categoryId: "",
        type: "",
        offset: 0,
        limit: 50,
      }),
      (err) => err && err.message === "builtin_source_read_failed",
    );

    assert.equal(builtinSyncCalls, 0);
  } finally {
    loader.restore();
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
