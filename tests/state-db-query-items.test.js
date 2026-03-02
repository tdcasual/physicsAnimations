const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createStateDbStore } = require("../server/lib/stateDb");
const { loadNodeSqlite } = require("../server/lib/nodeSqlite");

function hasNodeSqlite() {
  return Boolean(loadNodeSqlite());
}

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-state-db-query-items-"));
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}\n");
  return root;
}

function makeInMemoryStore({ itemsState }) {
  const blobs = new Map();

  if (itemsState) {
    blobs.set("items.json", Buffer.from(`${JSON.stringify(itemsState, null, 2)}\n`, "utf8"));
  }

  function normalizeKey(key) {
    return String(key || "").replace(/^\/+/, "");
  }

  return {
    mode: "local",
    readOnly: false,
    baseDir: "",
    baseUrl: "",
    basePath: "",
    local: {},
    webdav: {},

    async readBuffer(key) {
      return blobs.get(normalizeKey(key)) || null;
    },
    async writeBuffer(key, buffer) {
      blobs.set(normalizeKey(key), Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || ""));
    },
    async deletePath(key) {
      blobs.delete(normalizeKey(key));
    },
    async createReadStream() {
      return null;
    },
  };
}

test("state db queryItems keeps dynamic-only semantics and rejects unsupported type filter", async () => {
  if (!hasNodeSqlite()) return;

  const rootDir = makeTempRoot();
  const baseStore = makeInMemoryStore({
    itemsState: {
      version: 2,
      items: [
        {
          id: "d_no_time",
          type: "link",
          categoryId: "other",
          url: "https://example.com/d",
          title: "ZZZ Dynamic",
          description: "",
          thumbnail: "",
          order: 0,
          published: true,
          hidden: false,
          uploadKind: "html",
          createdAt: "",
          updatedAt: "",
        },
      ],
    },
  });

  const wrapped = createStateDbStore({
    rootDir,
    store: baseStore,
    mode: "sqlite",
    dbPath: path.join(rootDir, "content", "state.sqlite"),
  });

  try {
    assert.equal(wrapped.info?.enabled, true);

    const publicResult = await wrapped.store.stateDbQuery.queryItems({
      isAdmin: false,
      includeDeleted: false,
      q: "",
      categoryId: "",
      type: "",
      offset: 0,
      limit: 20,
    });

    assert.equal(publicResult.total, 1);
    assert.deepEqual(
      (publicResult.items || []).map((item) => item.id),
      ["d_no_time"],
    );

    const adminResult = await wrapped.store.stateDbQuery.queryItems({
      isAdmin: true,
      includeDeleted: true,
      q: "",
      categoryId: "",
      type: "",
      offset: 0,
      limit: 20,
    });

    assert.equal(adminResult.total, 1);
    assert.deepEqual(
      (adminResult.items || []).map((item) => item.id),
      ["d_no_time"],
    );

    const unsupportedTypeAdmin = await wrapped.store.stateDbQuery.queryItems({
      isAdmin: true,
      includeDeleted: true,
      q: "",
      categoryId: "",
      type: "legacy",
      offset: 0,
      limit: 20,
    });
    assert.equal(unsupportedTypeAdmin.total, 0);
    assert.deepEqual(unsupportedTypeAdmin.items, []);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});


test("state db queryItems applies stable tie-break ordering across dynamic rows", async () => {
  if (!hasNodeSqlite()) return;

  const rootDir = makeTempRoot();

  const baseStore = makeInMemoryStore({
    itemsState: {
      version: 2,
      items: [
        {
          id: "d_2",
          type: "link",
          categoryId: "other",
          url: "https://example.com/d2",
          title: "Same Dynamic",
          description: "",
          thumbnail: "",
          order: 0,
          published: true,
          hidden: false,
          uploadKind: "html",
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
        {
          id: "d_1",
          type: "upload",
          categoryId: "other",
          path: "content/uploads/d_1/index.html",
          title: "Same Dynamic",
          description: "",
          thumbnail: "",
          order: 0,
          published: true,
          hidden: false,
          uploadKind: "zip",
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
        {
          id: "d_3",
          type: "link",
          categoryId: "other",
          url: "https://example.com/d3",
          title: "Older Dynamic",
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
    },
  });

  const wrapped = createStateDbStore({
    rootDir,
    store: baseStore,
    mode: "sqlite",
    dbPath: path.join(rootDir, "content", "state.sqlite"),
  });

  try {
    const full = await wrapped.store.stateDbQuery.queryItems({
      isAdmin: true,
      includeDeleted: true,
      q: "",
      categoryId: "",
      type: "",
      offset: 0,
      limit: 20,
    });

    assert.equal(full.total, 3);
    assert.deepEqual(
      (full.items || []).map((item) => item.id),
      ["d_1", "d_2", "d_3"],
    );

    const crossPage = await wrapped.store.stateDbQuery.queryItems({
      isAdmin: true,
      includeDeleted: true,
      q: "",
      categoryId: "",
      type: "",
      offset: 2,
      limit: 2,
    });

    assert.equal(crossPage.total, 3);
    assert.deepEqual(
      (crossPage.items || []).map((item) => item.id),
      ["d_3"],
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("state db queryItems tolerates duplicate dynamic ids and keeps newest row", async () => {
  if (!hasNodeSqlite()) return;

  const rootDir = makeTempRoot();
  const baseStore = makeInMemoryStore({
    itemsState: {
      version: 2,
      items: [
        {
          id: "d_dup",
          type: "link",
          categoryId: "other",
          url: "https://example.com/new",
          title: "Newest",
          description: "",
          thumbnail: "",
          order: 0,
          published: true,
          hidden: false,
          uploadKind: "html",
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-03T00:00:00.000Z",
        },
        {
          id: "d_dup",
          type: "link",
          categoryId: "other",
          url: "https://example.com/old",
          title: "Old",
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
    },
  });

  const wrapped = createStateDbStore({
    rootDir,
    store: baseStore,
    mode: "sqlite",
    dbPath: path.join(rootDir, "content", "state.sqlite"),
  });

  try {
    const out = await wrapped.store.stateDbQuery.queryItems({
      isAdmin: true,
      includeDeleted: true,
      q: "",
      categoryId: "",
      type: "",
      offset: 0,
      limit: 20,
    });

    assert.equal(wrapped.info.circuitOpen, false);
    assert.equal(out.total, 1);
    assert.equal(out.items?.[0]?.id, "d_dup");
    assert.equal(out.items?.[0]?.title, "Newest");
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
