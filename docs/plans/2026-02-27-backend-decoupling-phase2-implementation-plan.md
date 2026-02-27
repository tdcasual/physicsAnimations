# Backend Decoupling Phase 2 (Query Ports + stateDb Modularization) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变现有 API 对外行为的前提下，完成后端“扩展性/解耦二期”改造：引入稳定查询端口（不再让业务层直接探测 `store.stateDbQuery`），并将 `stateDb` 单体文件拆分为可独立演进的模块。

**Architecture:** 采用“先锁行为、再搬结构”的增量策略。先通过契约测试引入 `itemsQueryRepo`/`taxonomyQueryRepo` 端口，再把 `items`/`categories`/`catalog` 改为依赖端口而非底层存储细节。随后对 `server/lib/stateDb.js` 做纯重构式模块拆分（circuit、query facade、wrapper、mirror），每一步都通过已有回归测试和新增 characterization tests 锁定行为。

**Tech Stack:** Node.js 24, Express 5, CommonJS, node:test, SQLite (`node:sqlite` via wrapper), Zod.

---

Related skills during execution: `@superpowers:test-driven-development`, `@superpowers:systematic-debugging`, `@superpowers:verification-before-completion`, `@superpowers:requesting-code-review`.

## Scope and Guardrails

- Preserve current API response shape and status codes for:
  - `/api/items`
  - `/api/items/:id`
  - `/api/categories`
  - `/api/catalog`
- Keep existing fallback semantics:
  - SQL unavailable/circuit open -> existing fallback or `state_db_unavailable` path remains unchanged.
- Refactor only backend files in `server/` + tests in `tests/` + one doc summary.
- YAGNI: Do not introduce new DB features or new endpoints in this phase.

## Pre-flight Constraints

- Work must run in isolated worktree.
- Every task is TDD red-green-refactor.
- One commit per task group (frequent, small).

---

### Task 0: Environment Baseline and Worktree Setup

**Files:**
- Create: None
- Modify: None
- Test: `tests/*.test.js`

**Step 1: Create isolated worktree**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
git worktree add ../physicsAnimations-phase2-decoupling -b codex/backend-decoupling-phase2
```

Expected: new worktree created on branch `codex/backend-decoupling-phase2`.

**Step 2: Run baseline backend tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
npm test
```

Expected: PASS (current baseline green before refactor).

**Step 3: Commit**

No commit for setup-only task.

---

### Task 1: Introduce Query Port Contracts (Adapter + Noop Repos)

**Files:**
- Create: `server/ports/queryRepos.js`
- Create: `tests/query-repos-contract.test.js`
- Modify: None
- Test: `tests/query-repos-contract.test.js`

**Step 1: Write the failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

test("createQueryReposFromStore exposes stable items/taxonomy repos", async () => {
  const { createQueryReposFromStore } = require("../server/ports/queryRepos");

  const store = {
    stateDbQuery: {
      async queryItems() {
        return { total: 1, items: [{ id: "x" }] };
      },
      async queryDynamicCategoryCounts() {
        return { byCategory: { mechanics: 2 } };
      },
    },
  };

  const repos = createQueryReposFromStore({ store });
  assert.equal(typeof repos.itemsQueryRepo.queryItems, "function");
  assert.equal(typeof repos.taxonomyQueryRepo.queryDynamicCategoryCounts, "function");

  const items = await repos.itemsQueryRepo.queryItems({});
  assert.equal(items.total, 1);

  const counts = await repos.taxonomyQueryRepo.queryDynamicCategoryCounts({});
  assert.equal(counts.byCategory.mechanics, 2);
});

test("noop repos return deterministic empty payloads", async () => {
  const { createNoopQueryRepos } = require("../server/ports/queryRepos");
  const repos = createNoopQueryRepos();

  const items = await repos.itemsQueryRepo.queryItems({});
  assert.deepEqual(items, { total: 0, items: [] });

  const counts = await repos.taxonomyQueryRepo.queryDynamicCategoryCounts({});
  assert.deepEqual(counts, { byCategory: {} });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/query-repos-contract.test.js
```

Expected: FAIL with `Cannot find module '../server/ports/queryRepos'`.

**Step 3: Write minimal implementation**

```js
// server/ports/queryRepos.js
function createNoopItemsQueryRepo() {
  return {
    async queryItems() { return { total: 0, items: [] }; },
    async queryDynamicItems() { return { total: 0, items: [] }; },
    async queryBuiltinItems() { return { total: 0, items: [] }; },
    async queryDynamicItemById() { return null; },
    async queryBuiltinItemById() { return null; },
  };
}

function createNoopTaxonomyQueryRepo() {
  return {
    async queryDynamicCategoryCounts() { return { byCategory: {} }; },
    async queryDynamicItemsForCatalog() { return { items: [] }; },
  };
}

function createQueryReposFromStore({ store }) {
  const sql = store?.stateDbQuery || {};
  const itemsNoop = createNoopItemsQueryRepo();
  const taxonomyNoop = createNoopTaxonomyQueryRepo();

  return {
    itemsQueryRepo: {
      queryItems: typeof sql.queryItems === "function" ? (o) => sql.queryItems(o) : itemsNoop.queryItems,
      queryDynamicItems:
        typeof sql.queryDynamicItems === "function" ? (o) => sql.queryDynamicItems(o) : itemsNoop.queryDynamicItems,
      queryBuiltinItems:
        typeof sql.queryBuiltinItems === "function" ? (o) => sql.queryBuiltinItems(o) : itemsNoop.queryBuiltinItems,
      queryDynamicItemById:
        typeof sql.queryDynamicItemById === "function"
          ? (o) => sql.queryDynamicItemById(o)
          : itemsNoop.queryDynamicItemById,
      queryBuiltinItemById:
        typeof sql.queryBuiltinItemById === "function"
          ? (o) => sql.queryBuiltinItemById(o)
          : itemsNoop.queryBuiltinItemById,
    },
    taxonomyQueryRepo: {
      queryDynamicCategoryCounts:
        typeof sql.queryDynamicCategoryCounts === "function"
          ? (o) => sql.queryDynamicCategoryCounts(o)
          : taxonomyNoop.queryDynamicCategoryCounts,
      queryDynamicItemsForCatalog:
        typeof sql.queryDynamicItemsForCatalog === "function"
          ? (o) => sql.queryDynamicItemsForCatalog(o)
          : taxonomyNoop.queryDynamicItemsForCatalog,
    },
  };
}

function createNoopQueryRepos() {
  return {
    itemsQueryRepo: createNoopItemsQueryRepo(),
    taxonomyQueryRepo: createNoopTaxonomyQueryRepo(),
  };
}

module.exports = {
  createQueryReposFromStore,
  createNoopQueryRepos,
  createNoopItemsQueryRepo,
  createNoopTaxonomyQueryRepo,
};
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/query-repos-contract.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/ports/queryRepos.js tests/query-repos-contract.test.js
git commit -m "test+feat(ports): add query repo contracts and store adapter"
```

---

### Task 2: Refactor Items Read Service to Depend on `itemsQueryRepo`

**Files:**
- Modify: `server/services/items/readService.js:1-236`
- Modify: `server/routes/items.js:31-99`
- Modify: `tests/items-read-service.test.js:1-85`
- Test: `tests/items-read-service.test.js`

**Step 1: Write/extend failing test**

Add a new case to `tests/items-read-service.test.js`:

```js
test("listItems uses injected itemsQueryRepo before touching in-memory loaders", async () => {
  const { createItemsReadService } = require("../server/services/items/readService");

  const service = createItemsReadService({
    store: {},
    itemsQueryRepo: {
      async queryItems() {
        return { total: 1, items: [{ id: "repo_1", type: "link" }] };
      },
    },
    deps: {
      loadItemsState: async () => {
        throw new Error("loadItemsState should not be called");
      },
      loadBuiltinItems: async () => {
        throw new Error("loadBuiltinItems should not be called");
      },
      toApiItem: (item) => item,
      safeText: (value) => String(value || ""),
    },
  });

  const out = await service.listItems({
    isAdmin: false,
    query: { page: 1, pageSize: 20, q: "", categoryId: "", type: "" },
  });

  assert.equal(out.total, 1);
  assert.equal(out.items[0].id, "repo_1");
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/items-read-service.test.js
```

Expected: FAIL because current service still reads `store.stateDbQuery` directly and ignores `itemsQueryRepo`.

**Step 3: Write minimal implementation**

- Update constructor:

```js
function createItemsReadService({ store, itemsQueryRepo, deps }) {
  const repo = itemsQueryRepo || {
    queryItems: typeof store?.stateDbQuery?.queryItems === "function" ? (o) => store.stateDbQuery.queryItems(o) : null,
    queryDynamicItems: typeof store?.stateDbQuery?.queryDynamicItems === "function" ? (o) => store.stateDbQuery.queryDynamicItems(o) : null,
    queryBuiltinItems: typeof store?.stateDbQuery?.queryBuiltinItems === "function" ? (o) => store.stateDbQuery.queryBuiltinItems(o) : null,
    queryDynamicItemById:
      typeof store?.stateDbQuery?.queryDynamicItemById === "function" ? (o) => store.stateDbQuery.queryDynamicItemById(o) : null,
    queryBuiltinItemById:
      typeof store?.stateDbQuery?.queryBuiltinItemById === "function" ? (o) => store.stateDbQuery.queryBuiltinItemById(o) : null,
  };
```

- Replace all `store.stateDbQuery.*` reads with `repo.*`.
- In `server/routes/items.js`, pass `itemsQueryRepo` to `createItemsReadService`.

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/items-read-service.test.js tests/items-merged-sql-path.test.js tests/items-split-sql-fallback-pagination.test.js tests/item-detail-sql-path.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/services/items/readService.js server/routes/items.js tests/items-read-service.test.js
git commit -m "test+refactor(items): inject items query repo into read service"
```

---

### Task 3: Wire Query Repos from Composition Root (`createApp`)

**Files:**
- Modify: `server/app.js:5-185`
- Modify: `server/routes/items.js:31-99`
- Create: `tests/app-query-repo-wiring.test.js`
- Test: `tests/app-query-repo-wiring.test.js`

**Step 1: Write failing integration test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { createApp } = require("../server/app");

test("createApp uses injected queryRepos for /api/items", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-app-repos-"));
  fs.mkdirSync(path.join(rootDir, "assets"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "animations"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "animations.json"), "{}\n");

  const app = createApp({
    rootDir,
    authConfig: {
      adminUsername: "admin",
      adminPasswordHash: bcrypt.hashSync("secret", 10),
      jwtSecret: "x",
      jwtIssuer: "physicsAnimations",
      jwtAudience: "physicsAnimations-web",
      tokenTtlSeconds: 3600,
    },
    store: {
      mode: "local",
      readOnly: false,
      async readBuffer() { return null; },
      async writeBuffer() {},
      async deletePath() {},
      async createReadStream() { return null; },
    },
    queryRepos: {
      itemsQueryRepo: {
        async queryItems() {
          return {
            total: 1,
            items: [{ id: "from_repo", type: "link", categoryId: "other", title: "X", description: "", url: "", thumbnail: "", order: 0, published: true, hidden: false, createdAt: "", updatedAt: "" }],
          };
        },
      },
      taxonomyQueryRepo: {
        async queryDynamicCategoryCounts() { return { byCategory: {} }; },
        async queryDynamicItemsForCatalog() { return { items: [] }; },
      },
    },
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });

  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/items?page=1&pageSize=10`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items[0].id, "from_repo");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/app-query-repo-wiring.test.js
```

Expected: FAIL because `createApp` currently ignores `queryRepos`.

**Step 3: Write minimal implementation**

- In `server/app.js`:
  - Add optional arg `queryRepos: overrideQueryRepos` to `createApp` signature.
  - Import adapter:

```js
const { createQueryReposFromStore } = require("./ports/queryRepos");
```

  - Build repos once:

```js
const queryRepos = overrideQueryRepos || createQueryReposFromStore({ store });
```

  - Pass to routers:

```js
app.use("/api", createItemsRouter({ rootDir, authConfig, store, taskQueue, queryRepos }));
app.use("/api", createCategoriesRouter({ rootDir, authConfig, store, queryRepos }));
```

- In `server/routes/items.js`, accept `queryRepos` param and pass `queryRepos?.itemsQueryRepo` to read service.

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/app-query-repo-wiring.test.js tests/items-read-service.test.js tests/items-merged-sql-path.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/app.js server/routes/items.js tests/app-query-repo-wiring.test.js
git commit -m "test+refactor(app): wire query repos through composition root"
```

---

### Task 4: Decouple Categories SQL Path from `store.stateDbQuery`

**Files:**
- Modify: `server/lib/categoriesPayload.js:130-218`
- Modify: `server/routes/categories.js:13-78`
- Create: `tests/categories-query-repo-port.test.js`
- Test: `tests/categories-query-repo-port.test.js`

**Step 1: Write failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCategoriesPayloadWithSql } = require("../server/lib/categoriesPayload");

test("buildCategoriesPayloadWithSql uses injected taxonomyQueryRepo", async () => {
  const payload = await buildCategoriesPayloadWithSql({
    rootDir: process.cwd(),
    store: {
      async readBuffer(key) {
        if (String(key) === "categories.json") {
          return Buffer.from('{"version":2,"groups":{},"categories":{}}\n', "utf8");
        }
        if (String(key) === "builtin_items.json") {
          return Buffer.from('{"version":1,"items":{}}\n', "utf8");
        }
        if (String(key) === "items.json") {
          return Buffer.from('{"version":2,"items":[]}\n', "utf8");
        }
        return null;
      },
    },
    isAdmin: false,
    taxonomyQueryRepo: {
      async queryDynamicCategoryCounts() {
        return { byCategory: { customx: 2 } };
      },
    },
  });

  const ids = new Set((payload.categories || []).map((c) => c.id));
  assert.equal(ids.has("customx"), true);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/categories-query-repo-port.test.js
```

Expected: FAIL because current implementation hardcodes `store.stateDbQuery.queryDynamicCategoryCounts`.

**Step 3: Write minimal implementation**

- In `buildCategoriesPayloadWithSql` constructor args:

```js
async function buildCategoriesPayloadWithSql({ rootDir, store, isAdmin, taxonomyQueryRepo }) {
  const repo = taxonomyQueryRepo || {
    queryDynamicCategoryCounts: (o) => store.stateDbQuery.queryDynamicCategoryCounts(o),
  };
  // ... use repo.queryDynamicCategoryCounts({ isAdmin })
}
```

- In `createCategoriesRouter`, accept `queryRepos` and pass:

```js
const taxonomyQueryRepo = queryRepos?.taxonomyQueryRepo;
const sqlPayload = await buildCategoriesPayloadWithSql({ rootDir, store, isAdmin, taxonomyQueryRepo });
```

- Replace local support check with repo-capability check:

```js
const supportsSqlDynamicCategoryCounts =
  typeof queryRepos?.taxonomyQueryRepo?.queryDynamicCategoryCounts === "function";
```

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/categories-query-repo-port.test.js tests/categories-sql-query.test.js tests/taxonomy.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/lib/categoriesPayload.js server/routes/categories.js tests/categories-query-repo-port.test.js
git commit -m "test+refactor(categories): inject taxonomy query repo for sql category counts"
```

---

### Task 5: Decouple Catalog Dynamic Loader from `store.stateDbQuery`

**Files:**
- Modify: `server/lib/catalog.js:140-188`
- Modify: `server/app.js:162-169`
- Modify: `server/lib/categoriesPayload.js:130-143`
- Create: `tests/catalog-query-repo-port.test.js`
- Test: `tests/catalog-query-repo-port.test.js`

**Step 1: Write failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadCatalog } = require("../server/lib/catalog");

test("loadCatalog uses injected taxonomyQueryRepo for dynamic catalog items", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-catalog-port-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "animations.json"), JSON.stringify({ mechanics: { title: "力学", items: [] } }, null, 2));

  const store = {
    async readBuffer(key) {
      const k = String(key || "").replace(/^\/+/, "");
      if (k === "builtin_items.json") return Buffer.from('{"version":1,"items":{}}\n', "utf8");
      if (k === "categories.json") return Buffer.from('{"version":2,"groups":{},"categories":{}}\n', "utf8");
      if (k === "items.json") return Buffer.from('{"version":2,"items":[]}\n', "utf8");
      return null;
    },
  };

  const out = await loadCatalog({
    rootDir,
    store,
    taxonomyQueryRepo: {
      async queryDynamicItemsForCatalog() {
        return {
          items: [{ id: "dyn1", type: "link", categoryId: "mechanics", title: "D", description: "", url: "https://example.com", thumbnail: "", order: 0, published: true, hidden: false, createdAt: "", updatedAt: "" }],
        };
      },
    },
  });

  const ids = new Set((out.groups.physics.categories.mechanics.items || []).map((i) => i.id));
  assert.equal(ids.has("dyn1"), true);

  fs.rmSync(rootDir, { recursive: true, force: true });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/catalog-query-repo-port.test.js
```

Expected: FAIL because `loadCatalog` currently only checks `store.stateDbQuery.queryDynamicItemsForCatalog`.

**Step 3: Write minimal implementation**

- Update signatures:

```js
async function loadDynamicCatalogItems({ store, taxonomyQueryRepo, includeHiddenItems, includeUnpublishedItems })
```

```js
const queryFn = taxonomyQueryRepo?.queryDynamicItemsForCatalog;
if (typeof queryFn === "function") {
  const sqlResult = await queryFn({ includeHiddenItems, includeUnpublishedItems });
  // existing shape checks + warning fallback retained
}
```

- Update `loadCatalog({...})` to accept `taxonomyQueryRepo` and pass into `loadDynamicCatalogItems`.
- In `app.js` `/api/catalog`, pass `taxonomyQueryRepo: queryRepos.taxonomyQueryRepo`.
- In `categoriesPayload.js` calling `loadCatalog` for SQL path, also pass `taxonomyQueryRepo`.

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/catalog-query-repo-port.test.js tests/catalog-sql-query.test.js tests/categories-sql-query.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/lib/catalog.js server/app.js server/lib/categoriesPayload.js tests/catalog-query-repo-port.test.js
git commit -m "test+refactor(catalog): use taxonomy query repo port for dynamic loader"
```

---

### Task 6: Add Characterization Test for `stateDb` Circuit Semantics Before Split

**Files:**
- Create: `tests/state-db-circuit-state.test.js`
- Create (later): `server/lib/stateDb/circuitState.js`
- Modify: `server/lib/stateDb.js:844-902` (later)
- Test: `tests/state-db-circuit-state.test.js`

**Step 1: Write failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { createStateDbCircuitState } = require("../server/lib/stateDb/circuitState");

test("circuit opens after max errors and records metadata", () => {
  const info = {
    circuitOpen: false,
    healthy: true,
    degraded: false,
    maxErrors: 2,
    errorCount: 0,
    consecutiveErrors: 0,
    lastError: "",
    lastErrorAt: "",
    lastSuccessAt: "",
  };

  const c = createStateDbCircuitState({ info, now: () => "2026-02-27T00:00:00.000Z" });

  c.markFailure("op1", new Error("x1"));
  assert.equal(info.circuitOpen, false);
  assert.equal(info.degraded, true);

  c.markFailure("op2", new Error("x2"));
  assert.equal(info.circuitOpen, true);
  assert.equal(info.healthy, false);
  assert.equal(info.degraded, false);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-circuit-state.test.js
```

Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

```js
// server/lib/stateDb/circuitState.js
function createStateDbCircuitState({ info, now = () => new Date().toISOString(), logger }) {
  let consecutiveErrors = Number(info?.consecutiveErrors || 0);

  function isUsable() {
    return !info.circuitOpen;
  }

  function markSuccess() {
    if (info.circuitOpen) return;
    consecutiveErrors = 0;
    info.consecutiveErrors = 0;
    info.healthy = true;
    info.degraded = false;
    info.lastSuccessAt = now();
  }

  function markFailure(operation, err) {
    const message = err?.message || String(err || "state_db_failed");
    info.errorCount += 1;
    consecutiveErrors += 1;
    info.consecutiveErrors = consecutiveErrors;
    info.lastError = `${operation}: ${message}`;
    info.lastErrorAt = now();

    if (consecutiveErrors >= info.maxErrors) {
      info.circuitOpen = true;
      info.healthy = false;
      info.degraded = false;
    } else {
      info.healthy = false;
      info.degraded = true;
    }

    if (logger?.warn) {
      logger.warn("state_db_operation_failed", {
        operation,
        message,
        consecutiveErrors,
        circuitOpen: info.circuitOpen,
      });
    }
  }

  return { isUsable, markSuccess, markFailure };
}

module.exports = { createStateDbCircuitState };
```

- Update `server/lib/stateDb.js` to use this module without behavior change.

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-circuit-state.test.js tests/state-db-circuit-breaker.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/lib/stateDb/circuitState.js server/lib/stateDb.js tests/state-db-circuit-state.test.js
git commit -m "test+refactor(state-db): extract circuit state module"
```

---

### Task 7: Extract `stateDb` Query Facade Module

**Files:**
- Create: `server/lib/stateDb/queryFacade.js`
- Modify: `server/lib/stateDb.js:961-1002`
- Create: `tests/state-db-query-facade.test.js`
- Test: `tests/state-db-query-facade.test.js`

**Step 1: Write failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { createStateDbQueryFacade } = require("../server/lib/stateDb/queryFacade");

test("query facade delegates through ensure+run wrappers", async () => {
  const calls = [];
  const facade = createStateDbQueryFacade({
    mirror: {
      queryItems: () => ({ total: 0, items: [] }),
    },
    ensureDynamicItemsIndexed: async () => calls.push("ensureDynamic"),
    ensureBuiltinItemsIndexed: async () => calls.push("ensureBuiltin"),
    runMirrorOperation: (op, fn) => {
      calls.push(op);
      return fn();
    },
    ensureUsable: () => calls.push("ensureUsable"),
  });

  await facade.queryItems({});
  assert.deepEqual(calls, ["ensureUsable", "ensureDynamic", "ensureBuiltin", "mirror.queryItems"]);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-query-facade.test.js
```

Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

```js
// server/lib/stateDb/queryFacade.js
function createStateDbQueryFacade({
  mirror,
  ensureDynamicItemsIndexed,
  ensureBuiltinItemsIndexed,
  runMirrorOperation,
  ensureUsable,
}) {
  return {
    async queryDynamicItems(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      return runMirrorOperation("mirror.queryDynamicItems", () => mirror.queryDynamicItems(options));
    },
    async queryDynamicItemsForCatalog(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      return runMirrorOperation("mirror.queryDynamicItemsForCatalog", () => mirror.queryDynamicItemsForCatalog(options));
    },
    async queryDynamicItemById(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      return runMirrorOperation("mirror.queryDynamicItemById", () => mirror.queryDynamicItemById(options));
    },
    async queryBuiltinItemById(options = {}) {
      ensureUsable();
      await ensureBuiltinItemsIndexed();
      return runMirrorOperation("mirror.queryBuiltinItemById", () => mirror.queryBuiltinItemById(options));
    },
    async queryBuiltinItems(options = {}) {
      ensureUsable();
      await ensureBuiltinItemsIndexed();
      return runMirrorOperation("mirror.queryBuiltinItems", () => mirror.queryBuiltinItems(options));
    },
    async queryItems(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      await ensureBuiltinItemsIndexed();
      return runMirrorOperation("mirror.queryItems", () => mirror.queryItems(options));
    },
    async queryDynamicCategoryCounts(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      return runMirrorOperation("mirror.queryDynamicCategoryCounts", () => mirror.queryDynamicCategoryCounts(options));
    },
  };
}

module.exports = { createStateDbQueryFacade };
```

- Wire `stateDb.js` to build `stateDbQuery` via this factory.

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-query-facade.test.js tests/state-db-query-items.test.js tests/items-sql-query.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/lib/stateDb/queryFacade.js server/lib/stateDb.js tests/state-db-query-facade.test.js
git commit -m "test+refactor(state-db): extract query facade"
```

---

### Task 8: Extract `stateDb` Wrapped Store Module

**Files:**
- Create: `server/lib/stateDb/wrappedStore.js`
- Modify: `server/lib/stateDb.js:1004-1188`
- Create: `tests/state-db-wrapped-store.test.js`
- Test: `tests/state-db-wrapped-store.test.js`

**Step 1: Write failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { createStateDbWrappedStore } = require("../server/lib/stateDb/wrappedStore");

test("wrapped store proxies non-state blobs directly", async () => {
  const base = {
    mode: "local",
    readOnly: false,
    async readBuffer(key) {
      return Buffer.from(String(key));
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() { return null; },
  };

  const wrapped = createStateDbWrappedStore({
    store: base,
    info: { circuitOpen: false },
    stateDbQuery: {},
    mirrorOps: {
      isStateBlobKey: () => false,
      normalizeKey: (k) => k,
      isUsable: () => true,
    },
  });

  const buf = await wrapped.readBuffer("uploads/a.txt");
  assert.equal(buf.toString("utf8"), "uploads/a.txt");
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-wrapped-store.test.js
```

Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

- Create wrapper factory that returns object with same interface as old `wrappedStore`.
- Move logic from `stateDb.js` into `wrappedStore.js` unchanged.
- Keep public behavior untouched.

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-wrapped-store.test.js tests/state-db-query-items.test.js tests/state-db-circuit-breaker.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/lib/stateDb/wrappedStore.js server/lib/stateDb.js tests/state-db-wrapped-store.test.js
git commit -m "test+refactor(state-db): extract wrapped store module"
```

---

### Task 9: Extract SQLite Mirror Builder Module

**Files:**
- Create: `server/lib/stateDb/sqliteMirror.js`
- Modify: `server/lib/stateDb.js:1-786`
- Create: `tests/state-db-sqlite-mirror.test.js`
- Test: `tests/state-db-sqlite-mirror.test.js`

**Step 1: Write failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { createSqliteMirror } = require("../server/lib/stateDb/sqliteMirror");

test("createSqliteMirror returns null when sqlite runtime is unavailable", () => {
  const mirror = createSqliteMirror({
    rootDir: process.cwd(),
    dbPath: "content/test.sqlite",
    deps: { loadNodeSqlite: () => null },
  });
  assert.equal(mirror, null);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-sqlite-mirror.test.js
```

Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

- Move from `stateDb.js` into `sqliteMirror.js`:
  - parse helpers for dynamic/builtin rows
  - schema/index creation
  - prepared statements
  - mirror query APIs
- Keep API identical:

```js
module.exports = {
  createSqliteMirror,
  normalizeStateDbMode,
};
```

- Keep `stateDb.js` as orchestrator that imports `createSqliteMirror` and `normalizeStateDbMode`.

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-sqlite-mirror.test.js tests/state-db-query-items.test.js tests/sqlite-warning-suppression.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/lib/stateDb/sqliteMirror.js server/lib/stateDb.js tests/state-db-sqlite-mirror.test.js
git commit -m "test+refactor(state-db): extract sqlite mirror builder"
```

---

### Task 10: Final Regression and Documentation

**Files:**
- Create: `docs/architecture/backend-query-ports.md`
- Modify: None (unless tiny wording fix)
- Test: `tests/*.test.js`

**Step 1: Full backend regression**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
npm test
```

Expected: PASS all tests.

**Step 2: Write architecture note**

Create `docs/architecture/backend-query-ports.md` with:

```md
# Backend Query Ports

- `itemsQueryRepo` is the only read-query dependency for items read paths.
- `taxonomyQueryRepo` is the only dynamic taxonomy/catalog read-query dependency.
- App composition root (`server/app.js`) builds repos from storage adapter.
- Business services/routes must not inspect `store.stateDbQuery` directly.

## Why

- Reduces storage implementation leakage into domain/service code.
- Enables swapping SQL/memory/mock implementations via one adapter boundary.

## Current Implementations

- Store adapter: `server/ports/queryRepos.js`
- SQLite source: `server/lib/stateDb/*`
```

**Step 3: Final verification subset for changed surfaces**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/items-read-service.test.js tests/categories-sql-query.test.js tests/catalog-sql-query.test.js tests/state-db-circuit-breaker.test.js tests/state-db-query-items.test.js
```

Expected: PASS.

**Step 4: Commit**

```bash
git add docs/architecture/backend-query-ports.md
git commit -m "docs: describe backend query ports and decoupled boundaries"
```

---

## Definition of Done

- No direct `store.stateDbQuery` access in:
  - `server/services/items/readService.js`
  - `server/routes/categories.js`
  - `server/lib/categoriesPayload.js`
  - `server/lib/catalog.js`
- `server/lib/stateDb.js` is orchestration-focused; heavy internals moved into `server/lib/stateDb/` modules.
- Full test suite passes.
- Architecture doc added.

## Fast Rollback Plan

- Revert per-task commit (small commits make rollback safe).
- If regressions occur after module extraction, roll back only the last extraction task commit and re-run targeted tests.

## Post-merge Checks

- Run one manual smoke:
  - `GET /api/items?page=1&pageSize=20`
  - `GET /api/categories`
  - `GET /api/catalog`
  - `GET /api/metrics`
- Confirm no API shape change and no new warning bursts in logs.
