# SQL-Only Read Path Hard Cut Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将当前 `dual (SQL + JSON fallback)` 读路径硬切为单轨 `sql_only`，并在切换窗口内保持可回滚。

**Architecture:** 采用“两次发布”策略。第一次发布只引入读路径策略开关并默认保持 `dual`，通过预发/小流量把运行配置切到 `sql_only` 做观测验证；第二次发布删除 JSON fallback 代码与测试，完成真正单轨。这样把“业务风险”和“代码清理风险”解耦，避免一次性删代码导致不可逆故障。

**Tech Stack:** Node.js, Express, `node --test`, existing query-port/read-service modules.

---

## Scope

- In scope:
  - `GET /api/items`
  - `GET /api/items/:id`
  - `GET /api/catalog`
  - `GET /api/categories`
  - 配置/文档/运维门禁更新
- Out of scope:
  - 写路径（items/library/system write APIs）
  - state-db 底层存储实现（sqlite mirror schema）
  - WebDAV 同步策略

## Hard-Cut Strategy (Recommended)

1. Release A: 引入 `READ_PATH_MODE`（`dual` / `sql_only`），默认 `dual`，代码仍双轨。
2. Release A rollout: 预发与生产先把 `READ_PATH_MODE=sql_only`，观察 24-72h。
3. Release B: 删除 JSON fallback 分支与 `dual` 模式，实现单轨。

## Acceptance Criteria

1. `READ_PATH_MODE=sql_only` 下，SQL port 缺失或 SQL 查询异常时，四个读接口统一返回 `503 { error: "state_db_unavailable" }`。
2. Release A 阶段，`READ_PATH_MODE=dual` 继续保持当前 fallback 行为不变。
3. Release B 阶段，代码库不再存在 JSON fallback 读分支（含 service/router/contract tests）。
4. `npm test`、`npm --prefix frontend run test -- --run`、`npm run qa:release` 全通过。

---

### Task 1: Introduce Read Path Mode Wiring (No Behavior Change by Default)

**Files:**
- Create: `server/lib/readPathMode.js`
- Modify: `server/app.js`
- Modify: `server/routes/items.js`
- Modify: `server/routes/categories.js`
- Modify: `server/lib/catalog.js`
- Test: `tests/read-path-mode-config.test.js`

**Step 1: Write failing config tests**

Add tests for:
- default mode is `dual`
- explicit `READ_PATH_MODE=sql_only` is accepted
- invalid mode throws at app bootstrap

```js
test("parseReadPathMode defaults to dual", () => {
  assert.equal(parseReadPathMode(undefined), "dual");
});
```

**Step 2: Run tests to verify RED**

Run:

```bash
node --test tests/read-path-mode-config.test.js
```

Expected: FAIL (`parseReadPathMode` not found / behavior mismatch).

**Step 3: Implement parser + wiring**

Implement `parseReadPathMode`:

```js
function parseReadPathMode(raw) {
  const mode = String(raw ?? "").trim().toLowerCase();
  if (!mode) return "dual";
  if (mode === "dual" || mode === "sql_only") return mode;
  throw new Error("invalid_read_path_mode");
}
```

Wire value from `createApp` into:
- items router `createItemsRouter({ ..., readPathMode })`
- categories router `createCategoriesRouter({ ..., readPathMode })`
- catalog loader `loadCatalog({ ..., readPathMode })`

**Step 4: Run tests to verify GREEN**

Run:

```bash
node --test tests/read-path-mode-config.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/lib/readPathMode.js server/app.js server/routes/items.js server/routes/categories.js server/lib/catalog.js tests/read-path-mode-config.test.js
git commit -m "feat(read-path): add READ_PATH_MODE wiring with dual default"
```

---

### Task 2: Enforce `sql_only` Behavior for Items Read Endpoints

**Files:**
- Modify: `server/services/items/readService.js`
- Modify: `tests/items-read-service.test.js`
- Modify: `tests/items-sql-unavailable-contract.test.js`
- Modify: `tests/state-db-circuit-breaker.test.js`
- Optional add: `tests/items-sql-only-contract.test.js`

**Step 1: Write failing contract tests for `sql_only`**

Add assertions:
- with `readPathMode=sql_only`, `queryItems` missing/throws => `503 state_db_unavailable`
- with `readPathMode=dual`, existing fallback assertions remain `200`

```js
assert.deepEqual(out, { status: 503, error: "state_db_unavailable" });
```

**Step 2: Run tests to verify RED**

```bash
node --test tests/items-read-service.test.js tests/items-sql-unavailable-contract.test.js tests/state-db-circuit-breaker.test.js
```

Expected: FAIL because current implementation always attempts fallback.

**Step 3: Implement minimal mode branch**

In `createItemsReadService`, add `readPathMode` and guard fallback:
- `dual`: keep current logic
- `sql_only`: do not call `loadItemsState` for list/detail fallback

```js
const allowJsonFallback = readPathMode !== "sql_only";
```

On SQL missing/throw with `sql_only`, return:

```js
{ status: 503, error: "state_db_unavailable" }
```

**Step 4: Run tests to verify GREEN**

```bash
node --test tests/items-read-service.test.js tests/items-sql-unavailable-contract.test.js tests/state-db-circuit-breaker.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/services/items/readService.js tests/items-read-service.test.js tests/items-sql-unavailable-contract.test.js tests/state-db-circuit-breaker.test.js
git commit -m "feat(items-read): enforce sql_only mode without json fallback"
```

---

### Task 3: Enforce `sql_only` Behavior for Catalog and Categories

**Files:**
- Modify: `server/lib/catalog/dynamicLoader.js`
- Modify: `server/lib/catalog.js`
- Modify: `server/routes/categories.js`
- Modify: `tests/catalog-sql-query.test.js`
- Modify: `tests/categories-sql-query.test.js`

**Step 1: Write failing tests**

Add mode-aware tests:
- `READ_PATH_MODE=sql_only` + SQL loader error => `/api/catalog` returns `503`
- `READ_PATH_MODE=sql_only` + category count query error => `/api/categories` returns `503`
- `READ_PATH_MODE=dual` retains fallback behavior (`200`)

**Step 2: Run tests to verify RED**

```bash
node --test tests/catalog-sql-query.test.js tests/categories-sql-query.test.js
```

Expected: FAIL because code still falls back to JSON in all modes.

**Step 3: Implement minimal mode branch**

In dynamic loader:
- if `sql_only` and SQL unavailable/fails, throw `state_db_unavailable` directly
- if `dual`, keep JSON fallback

In categories route:
- if `sql_only` and SQL dynamic counts unavailable/fails, return `503`
- if `dual`, keep `loadCatalog + buildCategoriesPayload` fallback

**Step 4: Run tests to verify GREEN**

```bash
node --test tests/catalog-sql-query.test.js tests/categories-sql-query.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/lib/catalog/dynamicLoader.js server/lib/catalog.js server/routes/categories.js tests/catalog-sql-query.test.js tests/categories-sql-query.test.js
git commit -m "feat(catalog-categories): enforce sql_only mode without json fallback"
```

---

### Task 4: Release A Rollout Guardrails (Config + Docs + Ops)

**Files:**
- Modify: `docs/guides/configuration.md`
- Modify: `docs/guides/ops-release-runbook.md`
- Modify: `docs/guides/continuous-improvement-roadmap.md`
- Add test: `tests/configuration-doc-read-path-mode.test.js`

**Step 1: Write failing docs contract test**

Add assertions:
- config doc includes `READ_PATH_MODE`
- runbook includes sql_only rollback instructions

**Step 2: Run tests to verify RED**

```bash
node --test tests/configuration-doc-read-path-mode.test.js tests/ops-docs.test.js
```

Expected: FAIL until docs are updated.

**Step 3: Update docs**

Document:
- `READ_PATH_MODE=dual|sql_only`
- rollout order: preprod -> canary -> full
- emergency rollback: set `READ_PATH_MODE=dual` and restart

**Step 4: Run tests to verify GREEN**

```bash
node --test tests/configuration-doc-read-path-mode.test.js tests/ops-docs.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add docs/guides/configuration.md docs/guides/ops-release-runbook.md docs/guides/continuous-improvement-roadmap.md tests/configuration-doc-read-path-mode.test.js
git commit -m "docs(read-path): document READ_PATH_MODE rollout and rollback"
```

---

### Task 5: Release A Full Verification + Controlled Cutover to `sql_only`

**Files:**
- No mandatory code file; this is rollout + evidence task.

**Step 1: Verify build/test gates**

```bash
npm test
npm --prefix frontend run test -- --run
npm run qa:release
```

Expected: all pass.

**Step 2: Preprod cutover**

Set:

```env
READ_PATH_MODE=sql_only
```

Run smoke + synthetic probes:
- `/api/items?page=1&pageSize=5`
- `/api/catalog`
- `/api/categories`

Expected: all 200 in healthy SQL case.

**Step 3: Production canary and observe**

Observe 24-72h:
- `http.statusCounts.5xx`
- `http.latencyMs.p95`
- SQL failure warnings (`items_sql_merged_query_failed`, `categories_sql_dynamic_counts_failed`)

Expected: no sustained regression.

**Step 4: Commit evidence docs**

Record exact command outputs and rollout timestamps in roadmap/runbook.

**Step 5: Commit**

```bash
git add docs/guides/continuous-improvement-roadmap.md docs/guides/ops-release-runbook.md
git commit -m "chore(release): record sql_only rollout evidence"
```

---

### Task 6: Release B Code Hard-Cut (Delete Dual-Track Fallback)

**Files:**
- Modify: `server/services/items/readService.js`
- Modify: `server/lib/catalog/dynamicLoader.js`
- Modify: `server/routes/categories.js`
- Modify: `server/lib/readPathMode.js` (or delete mode branching entirely)
- Modify/Delete fallback-oriented tests:
  - `tests/items-sql-unavailable-contract.test.js`
  - `tests/catalog-sql-query.test.js`
  - `tests/categories-sql-query.test.js`
  - `tests/state-db-circuit-breaker.test.js` (assertions switch to strict sql-only contract)

**Step 1: Write RED tests for final single track**

Replace/adjust contracts so SQL failure is always `503` for these read endpoints.

**Step 2: Run RED**

```bash
node --test tests/items-sql-unavailable-contract.test.js tests/catalog-sql-query.test.js tests/categories-sql-query.test.js tests/state-db-circuit-breaker.test.js
```

Expected: FAIL until fallback code removed.

**Step 3: Remove fallback code**

- Remove `loadItemsState` fallback helpers in items read service.
- Remove JSON fallback path in catalog dynamic loader.
- Remove categories fallback to base catalog payload when SQL dynamic count fails.
- Simplify mode parser to single supported mode or remove mode concept.

**Step 4: Run GREEN**

```bash
node --test tests/items-sql-unavailable-contract.test.js tests/catalog-sql-query.test.js tests/categories-sql-query.test.js tests/state-db-circuit-breaker.test.js
npm test
npm --prefix frontend run test -- --run
npm run qa:release
```

Expected: all pass.

**Step 5: Commit**

```bash
git add server/services/items/readService.js server/lib/catalog/dynamicLoader.js server/routes/categories.js server/lib/readPathMode.js tests/items-sql-unavailable-contract.test.js tests/catalog-sql-query.test.js tests/categories-sql-query.test.js tests/state-db-circuit-breaker.test.js
git commit -m "refactor(read-path): hard-cut to sql-only single-track reads"
```

---

## Rollback Plan

### During Release A (preferred rollback)

1. Set `READ_PATH_MODE=dual`.
2. Restart service.
3. Verify:

```bash
curl -sf http://127.0.0.1:4173/api/health
curl -i http://127.0.0.1:4173/api/items?page=1&pageSize=5
curl -i http://127.0.0.1:4173/api/catalog
curl -i http://127.0.0.1:4173/api/categories
```

### After Release B (code hard-cut complete)

1. Revert Release B commit(s):

```bash
git log --oneline -n 10
git revert --no-edit <sha_release_b>
```

2. Re-run gate:

```bash
npm run qa:release
```

3. Re-deploy and run endpoint checks above.

## Exit Criteria

1. Production runs in single-track SQL read path.
2. Read-path code no longer contains JSON fallback branches.
3. Docs and ops runbook reflect single-track operating model.
4. Fresh verification evidence (`qa:release`) is recorded in docs.
