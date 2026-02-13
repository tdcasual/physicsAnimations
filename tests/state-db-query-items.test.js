const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createStateDbStore } = require("../server/lib/stateDb");

function hasNodeSqlite() {
  try {
    require("node:sqlite");
    return true;
  } catch {
    return false;
  }
}

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-state-db-query-items-"));
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "animations.json"),
    JSON.stringify(
      {
        mechanics: {
          title: "力学",
          items: [
            {
              file: "mechanics/a.html",
              title: "AAA Builtin",
              description: "builtin",
              thumbnail: "",
            },
          ],
        },
      },
      null,
      2,
    ),
  );
  return root;
}

function makeInMemoryStore({ itemsState, builtinState }) {
  const blobs = new Map();

  if (itemsState) {
    blobs.set("items.json", Buffer.from(`${JSON.stringify(itemsState, null, 2)}\n`, "utf8"));
  }
  if (builtinState) {
    blobs.set("builtin_items.json", Buffer.from(`${JSON.stringify(builtinState, null, 2)}\n`, "utf8"));
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

test("state db queryItems preserves dynamic-first ordering and includeDeleted semantics", async () => {
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
    builtinState: {
      version: 1,
      items: {
        "mechanics/a.html": {
          deleted: true,
          updatedAt: "2026-01-03T00:00:00.000Z",
        },
      },
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

    assert.equal(adminResult.total, 2);
    assert.deepEqual(
      (adminResult.items || []).map((item) => item.id),
      ["d_no_time", "mechanics/a.html"],
    );

    const builtinOnlyAdmin = await wrapped.store.stateDbQuery.queryItems({
      isAdmin: true,
      includeDeleted: true,
      q: "",
      categoryId: "",
      type: "builtin",
      offset: 0,
      limit: 20,
    });
    assert.equal(builtinOnlyAdmin.total, 1);
    assert.deepEqual(
      (builtinOnlyAdmin.items || []).map((item) => item.id),
      ["mechanics/a.html"],
    );
    assert.equal(builtinOnlyAdmin.items?.[0]?.deleted, true);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});


test("state db queryItems applies stable tie-break ordering across dynamic and builtin rows", async () => {
  if (!hasNodeSqlite()) return;

  const rootDir = makeTempRoot();
  fs.writeFileSync(
    path.join(rootDir, "animations.json"),
    JSON.stringify(
      {
        mechanics: {
          title: "力学",
          items: [
            {
              file: "mechanics/a.html",
              title: "Alpha Builtin",
              description: "builtin",
              thumbnail: "",
            },
            {
              file: "mechanics/b.html",
              title: "Alpha Builtin",
              description: "builtin",
              thumbnail: "",
            },
          ],
        },
      },
      null,
      2,
    ),
  );

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
    builtinState: {
      version: 1,
      items: {
        "mechanics/b.html": {
          deleted: true,
          updatedAt: "2026-01-03T00:00:00.000Z",
        },
      },
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

    assert.equal(full.total, 5);
    assert.deepEqual(
      (full.items || []).map((item) => item.id),
      ["d_1", "d_2", "d_3", "mechanics/a.html", "mechanics/b.html"],
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

    assert.equal(crossPage.total, 5);
    assert.deepEqual(
      (crossPage.items || []).map((item) => item.id),
      ["d_3", "mechanics/a.html"],
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
