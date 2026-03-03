# T1 State DB Read Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变用户功能入口的前提下，把 `/api/items`、`/api/catalog`、`/api/categories` 从“SQL 失败即 503”升级为“优先 SQL，失败自动降级 JSON 读路径”。

**Architecture:** 保持现有 query-port 架构不变，只在读服务层增加 fallback。优先调用 `queryRepos`；当 SQL 不可用、缺失或抛错时，降级到 `items.json/categories.json` 的内存解析路径，并复用现有排序/过滤语义。仅当 SQL 与 JSON 两条路径都不可用时返回 `state_db_unavailable`。

**Tech Stack:** Node.js, Express, `node --test`, existing state/query modules (`server/lib/state.js`, `server/lib/catalog/*`, `server/lib/categoriesPayload.js`).

---

## Scope and Non-Goals

- In scope:
  - `GET /api/items`
  - `GET /api/items/:id`
  - `GET /api/catalog`
  - `GET /api/categories`
- Out of scope:
  - 写路径（create/update/delete）
  - state-db 熔断参数策略
  - WebDAV 同步行为

## Acceptance Criteria

1. 当 SQL query port 缺失或抛错时，以上 4 个 GET 路径仍返回 200（若 JSON 可读）。
2. 仅在 SQL 与 JSON 都不可用时返回 `503 { error: "state_db_unavailable" }`。
3. fallback 结果满足当前核心语义：
   - 非 admin 过滤 `published=false` 与 `hidden=true`
   - `type` 过滤兼容 `dynamic/link/upload`
   - 排序与分页稳定
4. `npm test` 全量通过，`npm run qa:release` 全绿。

---

### Half-Day Card 1 (Day 1 AM): Freeze Contract and Write RED Tests

**Files:**
- Modify: `tests/items-read-service.test.js`
- Modify: `tests/items-sql-unavailable-contract.test.js`
- Modify: `tests/catalog-sql-query.test.js`
- Modify: `tests/categories-sql-query.test.js`

**Steps:**
1. 将 3 条现有 503 契约测试改为 fallback 契约：
   - `items-sql-unavailable-contract`: SQL 抛错时应走 JSON 并返回 200。
   - `catalog-sql-query`: SQL loader 抛错时应回退并返回 200。
   - `categories-sql-query`: `queryDynamicCategoryCounts` 抛错时应回退并返回 200。
2. 在 `items-read-service.test.js` 新增 2 条服务级 RED 用例：
   - `queryItems` 缺失时 fallback 到 state JSON。
   - `queryItems` 抛错时 fallback 到 state JSON。
3. 保留 1 条保护性用例：当 `queryItems` 抛错且 `loadItemsState` 也失败时，返回 `state_db_unavailable`。

**Run (expect RED):**
```bash
node --test \
  tests/items-read-service.test.js \
  tests/items-sql-unavailable-contract.test.js \
  tests/catalog-sql-query.test.js \
  tests/categories-sql-query.test.js
```

**Expected RED signal:**
- 现实现仍返回 `503 state_db_unavailable`，与新断言 `200` 冲突。

**Checkpoint Commit:**
```bash
git add tests/items-read-service.test.js \
  tests/items-sql-unavailable-contract.test.js \
  tests/catalog-sql-query.test.js \
  tests/categories-sql-query.test.js
git commit -m "test(read-fallback): codify sql-to-json fallback contract (RED)"
```

**Rollback (if needed):**
```bash
git revert --no-edit HEAD
```

---

### Half-Day Card 2 (Day 1 PM): Implement Items Read Fallback

**Files:**
- Modify: `server/services/items/readService.js`
- Optional helper extraction: `server/services/items/readService.fallback.js` (only if needed to keep file under budget)

**Steps:**
1. 在 `createItemsReadService` 注入 `loadItemsState` 依赖（通过 `deps` 传入，避免跨层耦合）。
2. 实现 `listItems` fallback 分支：
   - SQL 正常：保留当前逻辑。
   - SQL 缺失或抛错：读取 `loadItemsState({ store })`，应用 `type/categoryId/q` 过滤。
   - 排序对齐 SQL：`createdAt DESC`, `title ASC (case-insensitive)`, `id ASC`。
   - 结果再做分页。
3. 实现 `getItemById` fallback：
   - SQL 缺失或抛错 -> 从 JSON items 中找 id。
   - 非 admin 下继续执行可见性过滤。
4. 当 fallback 源失败时保留 `503 state_db_unavailable`。

**Run (expect GREEN for items paths):**
```bash
node --test \
  tests/items-read-service.test.js \
  tests/items-sql-unavailable-contract.test.js \
  tests/items-query-port-required-contract.test.js
```

**Checkpoint Commit:**
```bash
git add server/services/items/readService.js \
  tests/items-read-service.test.js \
  tests/items-sql-unavailable-contract.test.js \
  tests/items-query-port-required-contract.test.js
git commit -m "feat(items-read): fallback to json state when sql query path is unavailable"
```

**Rollback (if needed):**
```bash
git revert --no-edit HEAD
```

---

### Half-Day Card 3 (Day 2 AM): Implement Catalog and Categories Fallback

**Files:**
- Modify: `server/lib/catalog/dynamicLoader.js`
- Modify: `server/routes/categories.js`
- Optional: `server/lib/categoriesPayload.js` (if fallback path needs helper reuse)

**Steps:**
1. `dynamicLoader.js`:
   - SQL 有效时优先 SQL。
   - SQL 抛错时直接 fallback `loadItemsState`（不再立即抛 `state_db_unavailable`）。
   - 仅当 fallback 也失败时抛 `state_db_unavailable`。
2. `categories.js`:
   - `buildCategoriesPayloadWithSql` 抛错时，不直接 `503`。
   - 回退到 `loadCatalog + buildCategoriesPayload`。
   - 仅当回退也失败时返回 `503 state_db_unavailable`。
3. 日志保留：
   - SQL 失败日志继续打 `warn`（用于观测）。
   - 增加 fallback 成功日志字段（可选）避免误判静默失败。

**Run (expect GREEN for catalog/categories):**
```bash
node --test \
  tests/catalog-sql-query.test.js \
  tests/categories-sql-query.test.js \
  tests/catalog-query-repo-port.test.js \
  tests/categories-query-repo-port.test.js
```

**Checkpoint Commit:**
```bash
git add server/lib/catalog/dynamicLoader.js \
  server/routes/categories.js \
  tests/catalog-sql-query.test.js \
  tests/categories-sql-query.test.js
git commit -m "feat(catalog-categories): fallback to state json when sql path fails"
```

**Rollback (if needed):**
```bash
git revert --no-edit HEAD
```

---

### Half-Day Card 4 (Day 2 PM): Parity Hardening and Edge-Case Tests

**Files:**
- Modify: `tests/items-read-service.test.js`
- Modify: `tests/catalog-sql-query.test.js`
- Modify: `tests/categories-sql-query.test.js`
- Optional: add `tests/items-read-fallback-parity.test.js`

**Steps:**
1. 增加 parity 用例，覆盖 fallback 与 SQL 的关键一致性：
   - `q` 模糊匹配字段：`title/description/url/path/id`
   - `type=dynamic|link|upload` 过滤
   - admin/non-admin 可见性差异
   - 分页边界：`offset >= total` 返回空数组
2. 增加“fallback 失败仍 503”用例，保证错误信号不被吞掉。
3. 若 `readService.js` 行数接近预算，提取纯函数 helper 并加尺寸守护测试。

**Run (expect GREEN):**
```bash
node --test \
  tests/items-read-service.test.js \
  tests/items-sql-unavailable-contract.test.js \
  tests/catalog-sql-query.test.js \
  tests/categories-sql-query.test.js \
  tests/file-line-budgets.test.js
```

**Checkpoint Commit:**
```bash
git add tests/items-read-service.test.js \
  tests/items-sql-unavailable-contract.test.js \
  tests/catalog-sql-query.test.js \
  tests/categories-sql-query.test.js \
  tests/file-line-budgets.test.js
git commit -m "test(read-fallback): harden sql/json parity and failure boundaries"
```

**Rollback (if needed):**
```bash
git revert --no-edit HEAD
```

---

### Half-Day Card 5 (Day 3 AM): Full Verification, Docs, and Rollout Notes

**Files:**
- Modify: `docs/guides/continuous-improvement-roadmap.md`
- Modify: `docs/guides/ops-release-runbook.md` (only if operational signal changes)

**Steps:**
1. 执行全量验证并记录证据。
2. 在 roadmap 增加 T1 完成记录：
   - 行为变化：读路径从 fail-fast 503 改为 SQL->JSON fallback。
   - 风险变化：state-db 故障影响从“全读不可用”下降到“性能退化 + 告警”。
3. 补充 runbook 一条排障说明：
   - 指标异常但功能可用时，优先检查 state-db/sqlite 健康。

**Run (must pass):**
```bash
npm test
npm --prefix frontend run test -- --run
npm run qa:release
```

**Expected GREEN signal:**
- `qa:release` 全通过。
- 新 fallback 契约测试全通过。

**Checkpoint Commit:**
```bash
git add docs/guides/continuous-improvement-roadmap.md \
  docs/guides/ops-release-runbook.md
git commit -m "docs(ops): document state-db read fallback behavior and verification evidence"
```

**Rollback (if needed):**
```bash
git revert --no-edit HEAD
```

---

## Final Rollback Strategy (Whole T1)

If production regression appears after all cards:

1. Revert feature commits in reverse order:
```bash
git log --oneline -n 10
git revert --no-edit <latest_sha>
git revert --no-edit <previous_sha>
```
2. Re-run gate:
```bash
npm run qa:release
```
3. Validate key endpoints:
```bash
curl -sf http://127.0.0.1:4173/api/health
curl -i http://127.0.0.1:4173/api/items?page=1&pageSize=5
curl -i http://127.0.0.1:4173/api/catalog
curl -i http://127.0.0.1:4173/api/categories
```

## Exit Criteria for T1

1. 4 个读接口在 SQL 异常场景仍可读（JSON fallback）。
2. fallback 与 SQL 核心过滤/排序行为一致。
3. 门禁不退化（`qa:release` 通过且时长不显著增加）。
