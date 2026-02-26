# Extensibility Foundation Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变现有 API 行为的前提下，完成“可扩展性一期”改造：拆分 `items` 领域读写服务、建立前端管理端类型化 API 契约、降低后续功能扩展耦合成本。

**Architecture:** 采用“行为锁定优先”的增量重构策略。先通过回归测试锁定现有 `/api/items` 行为，再将 `server/routes/items.js` 的读写逻辑拆分到 `server/services/items/*`，最后为 `frontend/src/features/admin/adminApi.ts` 增加契约解析与类型边界。整个过程保持端到端接口不变，先做最小重构，再做全量验证。

**Tech Stack:** Node.js 24, Express 5, Zod, Vue 3, TypeScript, Vitest, Node test runner.

---

Related skills during execution: `@superpowers:test-driven-development`, `@superpowers:systematic-debugging`, `@superpowers:verification-before-completion`, `@superpowers:requesting-code-review`.

### Task 0: Baseline Verification

**Files:**
- None (verification only)

**Step 1: Run backend baseline**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/*.test.js
```

Expected: PASS, no pre-existing regressions before refactor.

**Step 2: Run frontend baseline**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
npm --prefix frontend run test
```

Expected: PASS.

---

### Task 1: Add Failing Tests For Items Read Service

**Files:**
- Create: `tests/items-read-service.test.js`
- Create (later): `server/services/items/readService.js`
- Modify (later): `server/routes/items.js`

**Step 1: Write the failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

test("createItemsReadService exposes listItems and getItemById", async () => {
  const { createItemsReadService } = require("../server/services/items/readService");
  assert.equal(typeof createItemsReadService, "function");
});

test("listItems prefers merged SQL query when available", async () => {
  const { createItemsReadService } = require("../server/services/items/readService");
  const service = createItemsReadService({
    store: {
      stateDbQuery: {
        async queryItems() {
          return { total: 1, items: [{ id: "x1", type: "link" }] };
        },
      },
    },
    deps: {
      loadItemsState: async () => ({ items: [] }),
      loadBuiltinItems: async () => [],
      toApiItem: (x) => x,
      safeText: (x) => String(x || ""),
    },
  });

  const out = await service.listItems({
    isAdmin: false,
    query: { page: 1, pageSize: 20, q: "", categoryId: "", type: "" },
  });
  assert.equal(out.total, 1);
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].id, "x1");
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/items-read-service.test.js
```

Expected: FAIL with `Cannot find module '../server/services/items/readService'`.

**Step 3: Commit**

No commit in this task.

---

### Task 2: Implement Items Read Service And Route Read Delegation

**Files:**
- Create: `server/services/items/readService.js`
- Modify: `server/routes/items.js`
- Test: `tests/items-read-service.test.js`

**Step 1: Write minimal implementation**

```js
// server/services/items/readService.js
function createItemsReadService({ store, deps }) {
  const { loadItemsState, loadBuiltinItems, toApiItem, safeText } = deps;

  async function listItems({ isAdmin, query }) {
    const q = String(query.q || "").trim().toLowerCase();
    const categoryId = String(query.categoryId || "").trim();
    const type = String(query.type || "").trim();
    const offset = (query.page - 1) * query.pageSize;

    if (typeof store?.stateDbQuery?.queryItems === "function") {
      const sql = await store.stateDbQuery.queryItems({
        isAdmin,
        includeDeleted: isAdmin,
        q,
        categoryId,
        type,
        offset,
        limit: query.pageSize,
      });
      return {
        page: query.page,
        pageSize: query.pageSize,
        total: Number(sql?.total || 0),
        items: (sql?.items || []).map(toApiItem),
      };
    }

    const dynamicState = await loadItemsState({ store });
    const builtinItems = await loadBuiltinItems({ includeDeleted: isAdmin });
    const merged = [...(dynamicState?.items || []), ...builtinItems];
    const filtered = merged.filter((it) => {
      if (!isAdmin && (it.published === false || it.hidden === true)) return false;
      if (categoryId && it.categoryId !== categoryId) return false;
      if (type && it.type !== type) return false;
      if (!q) return true;
      const hay = `${it.title || ""}\n${it.description || ""}\n${it.url || ""}\n${it.path || ""}\n${it.id || ""}`.toLowerCase();
      return hay.includes(q);
    });
    filtered.sort((a, b) => safeText(b.createdAt).localeCompare(safeText(a.createdAt)));
    const pageItems = filtered.slice(offset, offset + query.pageSize).map(toApiItem);
    return { page: query.page, pageSize: query.pageSize, total: filtered.length, items: pageItems };
  }

  async function getItemById({ id, isAdmin, findBuiltinItemById }) {
    if (typeof store?.stateDbQuery?.queryDynamicItemById === "function") {
      const sqlDynamic = await store.stateDbQuery.queryDynamicItemById({ id, isAdmin }).catch(() => null);
      if (sqlDynamic) return toApiItem(sqlDynamic);
    }
    const state = await loadItemsState({ store });
    const dynamic = (state?.items || []).find((it) => it.id === id);
    if (dynamic && (isAdmin || (dynamic.published !== false && dynamic.hidden !== true))) {
      return toApiItem(dynamic);
    }
    const builtin = await findBuiltinItemById(id, { includeDeleted: isAdmin });
    if (!builtin) return null;
    if (!isAdmin && (builtin.published === false || builtin.hidden === true)) return null;
    return toApiItem(builtin);
  }

  return { listItems, getItemById };
}

module.exports = { createItemsReadService };
```

**Step 2: Delegate GET routes in `items.js`**

- Keep request parsing in route.
- Replace internal read branches with `readService.listItems(...)` and `readService.getItemById(...)`.
- Keep response JSON shape unchanged.

**Step 3: Run target tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test \
  tests/items-read-service.test.js \
  tests/items-merged-sql-path.test.js \
  tests/items-split-sql-fallback-pagination.test.js \
  tests/item-detail-sql-path.test.js
```

Expected: PASS.

**Step 4: Commit**

```bash
git add server/services/items/readService.js server/routes/items.js tests/items-read-service.test.js
git commit -m "test+refactor(items): extract read service and delegate get routes"
```

---

### Task 3: Add Failing Tests For Items Write Service

**Files:**
- Create: `tests/items-write-service.test.js`
- Create (later): `server/services/items/writeService.js`
- Modify (later): `server/routes/items.js`

**Step 1: Write failing tests**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

test("createItemsWriteService exposes updateItem and deleteItem", async () => {
  const { createItemsWriteService } = require("../server/services/items/writeService");
  assert.equal(typeof createItemsWriteService, "function");
});

test("updateItem updates dynamic item and returns updated entity", async () => {
  const { createItemsWriteService } = require("../server/services/items/writeService");
  let state = { items: [{ id: "d1", type: "link", title: "A", hidden: false, published: true }] };
  const service = createItemsWriteService({
    store: {},
    deps: {
      mutateItemsState: async (_ctx, mutator) => mutator(state),
      mutateBuiltinItemsState: async () => null,
      mutateItemTombstonesState: async () => null,
      normalizeCategoryId: (v) => v || "other",
      noSave: (v) => ({ __noSave: true, value: v }),
      loadBuiltinIndex: () => [],
      findBuiltinItemById: async () => null,
      toApiItem: (x) => x,
    },
  });

  const out = await service.updateItem({
    id: "d1",
    patch: { title: "B", hidden: true },
  });

  assert.equal(out.ok, true);
  assert.equal(out.item.title, "B");
  assert.equal(out.item.hidden, true);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/items-write-service.test.js
```

Expected: FAIL with module not found.

**Step 3: Commit**

No commit in this task.

---

### Task 4: Implement Items Write Service And Route Write Delegation

**Files:**
- Create: `server/services/items/writeService.js`
- Modify: `server/routes/items.js`
- Test: `tests/items-write-service.test.js`

**Step 1: Write minimal implementation**

```js
// server/services/items/writeService.js
function createItemsWriteService({ store, deps }) {
  const {
    mutateItemsState,
    mutateBuiltinItemsState,
    mutateItemTombstonesState,
    normalizeCategoryId,
    noSave,
    loadBuiltinIndex,
    findBuiltinItemById,
    toApiItem,
  } = deps;

  async function updateItem({ id, patch }) {
    const dynamicResult = await mutateItemsState({ store }, (state) => {
      const dynamic = state.items.find((it) => it.id === id);
      if (!dynamic) return noSave(null);
      if (patch.deleted !== undefined) return noSave({ __kind: "unsupported_change" });
      if (patch.title !== undefined) dynamic.title = patch.title;
      if (patch.description !== undefined) dynamic.description = patch.description;
      if (patch.categoryId !== undefined) dynamic.categoryId = normalizeCategoryId(patch.categoryId);
      if (patch.order !== undefined) dynamic.order = patch.order;
      if (patch.published !== undefined) dynamic.published = patch.published;
      if (patch.hidden !== undefined) dynamic.hidden = patch.hidden;
      dynamic.updatedAt = new Date().toISOString();
      return dynamic;
    });
    if (dynamicResult?.__kind === "unsupported_change") return { error: "unsupported_change" };
    if (dynamicResult) return { ok: true, item: toApiItem(dynamicResult) };

    const builtinBase = loadBuiltinIndex().find((it) => it.id === id);
    if (!builtinBase) return { error: "not_found" };

    await mutateBuiltinItemsState({ store }, (builtinState) => {
      if (!builtinState.items) builtinState.items = {};
      const current = builtinState.items[id] && typeof builtinState.items[id] === "object" ? { ...builtinState.items[id] } : {};
      if (patch.title !== undefined) current.title = String(patch.title || "").trim();
      if (patch.description !== undefined) current.description = String(patch.description || "");
      if (patch.categoryId !== undefined) current.categoryId = normalizeCategoryId(String(patch.categoryId || ""));
      if (patch.order !== undefined) current.order = patch.order;
      if (patch.published !== undefined) current.published = patch.published;
      if (patch.hidden !== undefined) current.hidden = patch.hidden;
      if (patch.deleted === true) current.deleted = true;
      if (patch.deleted === false) delete current.deleted;
      current.updatedAt = new Date().toISOString();
      builtinState.items[id] = current;
    });

    const updated = await findBuiltinItemById(id, { includeDeleted: true });
    if (!updated) return { error: "not_found" };
    return { ok: true, item: toApiItem(updated) };
  }

  async function deleteItem({ id }) {
    const deletedAt = new Date().toISOString();
    const deleted = await mutateItemsState({ store }, async (state) => {
      const target = state.items.find((it) => it.id === id);
      state.items = state.items.filter((it) => it.id !== id);
      if (!target) return noSave(null);
      if (target.type === "upload") await store.deletePath(`uploads/${id}`, { recursive: true });
      if (target.thumbnail) await store.deletePath(`thumbnails/${id}.png`);
      return target;
    });

    if (deleted) {
      await mutateItemTombstonesState({ store }, (tombstones) => {
        if (!tombstones.tombstones) tombstones.tombstones = {};
        tombstones.tombstones[id] = { deletedAt };
      }).catch(() => {});
      return { ok: true };
    }

    const builtinBase = loadBuiltinIndex().find((it) => it.id === id);
    if (!builtinBase) return { error: "not_found" };
    await mutateBuiltinItemsState({ store }, (builtinState) => {
      if (!builtinState.items) builtinState.items = {};
      const current = builtinState.items[id] && typeof builtinState.items[id] === "object" ? { ...builtinState.items[id] } : {};
      current.deleted = true;
      current.updatedAt = new Date().toISOString();
      builtinState.items[id] = current;
    });
    return { ok: true };
  }

  return { updateItem, deleteItem };
}

module.exports = { createItemsWriteService };
```

**Step 2: Delegate PUT/DELETE routes in `items.js`**

- Route continues to parse/validate request.
- Business mutation logic switches to `writeService.updateItem(...)` and `writeService.deleteItem(...)`.
- Keep existing HTTP status code behavior unchanged.

**Step 3: Run target tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test \
  tests/items-write-service.test.js \
  tests/items-builtin-sql-path.test.js \
  tests/items-sql-query.test.js \
  tests/upload-paths.test.js
```

Expected: PASS.

**Step 4: Commit**

```bash
git add server/services/items/writeService.js server/routes/items.js tests/items-write-service.test.js
git commit -m "test+refactor(items): extract write service and delegate put/delete routes"
```

---

### Task 5: Add Failing Tests For Frontend Admin API Contracts

**Files:**
- Create: `frontend/test/admin-api-contract.test.ts`
- Create (later): `frontend/src/features/admin/adminContracts.ts`
- Modify (later): `frontend/src/features/admin/adminApi.ts`

**Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { parseAdminItemsResponse, toApiError } from "../src/features/admin/adminContracts";

describe("admin api contracts", () => {
  it("normalizes item list payload", () => {
    const out = parseAdminItemsResponse({ page: "2", pageSize: "24", total: "3", items: [{ id: "a1" }] });
    expect(out.page).toBe(2);
    expect(out.pageSize).toBe(24);
    expect(out.total).toBe(3);
    expect(out.items).toHaveLength(1);
  });

  it("maps backend error payload to typed error", () => {
    const err = toApiError(400, { error: "invalid_input" });
    expect(err.code).toBe("invalid_input");
    expect(err.status).toBe(400);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
npm --prefix frontend run test -- test/admin-api-contract.test.ts
```

Expected: FAIL with `Cannot find module '../src/features/admin/adminContracts'`.

**Step 3: Commit**

No commit in this task.

---

### Task 6: Implement Frontend Admin Contracts And Typed API Boundary

**Files:**
- Create: `frontend/src/features/admin/adminContracts.ts`
- Create: `frontend/src/features/admin/adminTypes.ts`
- Modify: `frontend/src/features/admin/adminApi.ts`
- Modify: `frontend/src/views/admin/AdminDashboardView.vue`
- Modify: `frontend/src/views/admin/AdminContentView.vue`
- Modify: `frontend/src/views/admin/AdminUploadsView.vue`
- Modify: `frontend/src/views/admin/AdminTaxonomyView.vue`
- Modify: `frontend/src/views/admin/AdminSystemView.vue`
- Test: `frontend/test/admin-api-contract.test.ts`

**Step 1: Add contract and type modules**

```ts
// frontend/src/features/admin/adminTypes.ts
export interface AdminItemRow {
  id: string;
  type: string;
  categoryId: string;
  title: string;
  description: string;
  thumbnail?: string;
  src?: string;
  order?: number;
  published?: boolean;
  hidden?: boolean;
  deleted?: boolean;
}

export interface AdminItemsResponse {
  page: number;
  pageSize: number;
  total: number;
  items: AdminItemRow[];
}

export interface AdminApiErrorShape {
  code: string;
  status: number;
  details?: unknown;
}
```

```ts
// frontend/src/features/admin/adminContracts.ts
import type { AdminApiErrorShape, AdminItemsResponse } from "./adminTypes";

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function parseAdminItemsResponse(raw: any): AdminItemsResponse {
  return {
    page: toInt(raw?.page, 1),
    pageSize: toInt(raw?.pageSize, 24),
    total: toInt(raw?.total, 0),
    items: Array.isArray(raw?.items) ? raw.items : [],
  };
}

export function toApiError(status: number, data: any): AdminApiErrorShape {
  return {
    status,
    code: typeof data?.error === "string" ? data.error : "request_failed",
    details: data?.details,
  };
}
```

**Step 2: Refactor `adminApi.ts` to use typed contracts**

- `apiFetch` throws typed `AdminApiErrorShape`.
- `listAdminItems` returns `Promise<AdminItemsResponse>` via `parseAdminItemsResponse`.
- Keep path and payload protocol unchanged.

**Step 3: Replace duplicated local interfaces in admin views with shared types**

- Import `AdminItemRow` where needed.
- Keep template and interaction behavior unchanged.

**Step 4: Run frontend tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
npm --prefix frontend run test -- \
  test/admin-api-contract.test.ts \
  test/admin-content-api.test.ts \
  test/admin-dashboard-api.test.ts \
  test/admin-taxonomy-feedback.test.ts \
  test/admin-system-feedback-hints.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add \
  frontend/src/features/admin/adminTypes.ts \
  frontend/src/features/admin/adminContracts.ts \
  frontend/src/features/admin/adminApi.ts \
  frontend/src/views/admin/AdminDashboardView.vue \
  frontend/src/views/admin/AdminContentView.vue \
  frontend/src/views/admin/AdminUploadsView.vue \
  frontend/src/views/admin/AdminTaxonomyView.vue \
  frontend/src/views/admin/AdminSystemView.vue \
  frontend/test/admin-api-contract.test.ts
git commit -m "test+refactor(frontend): add typed admin api contracts"
```

---

### Task 7: Docs Update And Final Verification

**Files:**
- Modify: `docs/guides/api.md`
- Modify: `docs/guides/spa-and-frontend.md`

**Step 1: Document service split and frontend contract boundary**

Update docs with:
- Backend `items` service-layer split (`readService` / `writeService`)
- Frontend admin API contract parsing and typed error shape
- Explicit note: external API behavior unchanged in phase 1

**Step 2: Run full verification**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
npm --prefix frontend run test
npm --prefix frontend run build
node --test tests/*.test.js
npm run smoke:spa-public
npm run smoke:spa-admin
npm run smoke:spa-admin-write
```

Expected: All PASS.

**Step 3: Final commit**

```bash
git add docs/guides/api.md docs/guides/spa-and-frontend.md
git commit -m "docs: document extensibility phase1 service and contract boundaries"
```

