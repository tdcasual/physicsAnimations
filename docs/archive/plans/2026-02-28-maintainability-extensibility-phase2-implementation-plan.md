# Maintainability + Extensibility Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变现有用户行为与 API 语义的前提下，系统性提升项目可维护性与扩展性（前端状态拆分、后端路由拆分、扩展协议收敛、质量门禁强化）。

**Architecture:** 采用“先立护栏、再拆结构、最后统一契约”的增量式重构。先把体积和验证门禁固化为自动测试，再拆大文件与耦合层，最后补齐扩展协议与交付文档，确保每一步都可回滚且可验证。所有改动遵循 DRY/YAGNI、TDD、小步提交。

**Tech Stack:** Node.js 24, Express 5, Vue 3, TypeScript, Vitest, Node test runner, Zod.

---

Related skills during execution: `@superpowers:test-driven-development`, `@superpowers:systematic-debugging`, `@superpowers:verification-before-completion`, `@superpowers:requesting-code-review`.

## Weekly Roadmap

- Week 1: 建立维护护栏与质量门禁（Task 0-2）
- Week 2: 前端 library-admin 状态编排拆分（Task 3）
- Week 3: 后端 library 路由与适配器扩展协议拆分（Task 4-5）
- Week 4: state-db 大文件拆分 + 文档化完成定义（Task 6-7）

---

### Task 0: Baseline Verification (No Behavior Change)

**Files:**
- None (verification only)

**Step 1: Run backend baseline**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
npm test
```

Expected: PASS.

**Step 2: Run frontend baseline**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
npm --prefix frontend run test
npm --prefix frontend run build
```

Expected: PASS.

**Step 3: Commit**

No commit in this task.

---

### Task 1: Add Maintainability Guardrail Tests (File Budgets)

**Files:**
- Create: `tests/library-route-size.test.js`
- Create: `tests/state-db-sqlite-mirror-size.test.js`
- Create: `frontend/test/library-admin-state-size.test.ts`
- Modify: `package.json` (ensure root test command includes new tests via existing glob)

**Step 1: Write failing backend route size test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("library route stays below 340 lines after route splitting", () => {
  const filePath = path.join(__dirname, "..", "server", "routes", "library.js");
  const lines = fs.readFileSync(filePath, "utf8").split("\n").length;
  assert.ok(lines < 340, `server/routes/library.js has ${lines} lines, expected < 340`);
});
```

**Step 2: Run test and verify RED**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/library-route-size.test.js
```

Expected: FAIL (current file is above threshold).

**Step 3: Write failing sqlite mirror size test**

```js
test("sqlite mirror stays below 620 lines after extraction", () => {
  const filePath = path.join(__dirname, "..", "server", "lib", "stateDb", "sqliteMirror.js");
  const lines = fs.readFileSync(filePath, "utf8").split("\n").length;
  assert.ok(lines < 620, `sqliteMirror.js has ${lines} lines, expected < 620`);
});
```

**Step 4: Run test and verify RED**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-sqlite-mirror-size.test.js
```

Expected: FAIL.

**Step 5: Write failing frontend state size test**

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("library admin state maintainability budget", () => {
  it("keeps useLibraryAdminState below 500 lines", () => {
    const p = path.resolve(process.cwd(), "src/features/library/useLibraryAdminState.ts");
    const lines = fs.readFileSync(p, "utf8").split("\n").length;
    expect(lines).toBeLessThan(500);
  });
});
```

**Step 6: Run test and verify RED**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm test -- test/library-admin-state-size.test.ts
```

Expected: FAIL.

**Step 7: Commit**

```bash
git add tests/library-route-size.test.js tests/state-db-sqlite-mirror-size.test.js frontend/test/library-admin-state-size.test.ts
git commit -m "test(maintainability): add file-size guardrail tests"
```

---

### Task 2: Strengthen Quality Gates (Typecheck + Release Gate)

**Files:**
- Modify: `frontend/package.json`
- Modify: `package.json`
- Modify: `scripts/qa_release_gate.sh`

**Step 1: Write failing frontend typecheck command usage test (script contract)**

Create temporary script contract test in `tests/qa-release-gate.test.js` pattern (extend existing) asserting `qa_release_gate.sh` includes frontend typecheck command.

```js
assert.match(scriptText, /npm --prefix frontend run typecheck/);
```

**Step 2: Run test and verify RED**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/qa-release-gate.test.js
```

Expected: FAIL.

**Step 3: Add `typecheck` script in frontend package**

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit -p tsconfig.json"
  }
}
```

**Step 4: Add root proxy script and wire release gate**

`package.json`:
```json
{
  "scripts": {
    "typecheck:frontend": "npm --prefix frontend run typecheck"
  }
}
```

`scripts/qa_release_gate.sh` add before smoke:
```bash
npm run typecheck:frontend
```

**Step 5: Run targeted tests and gate script**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/qa-release-gate.test.js
npm run qa:release
```

Expected: PASS.

**Step 6: Commit**

```bash
git add frontend/package.json package.json scripts/qa_release_gate.sh tests/qa-release-gate.test.js
git commit -m "chore(quality): add frontend typecheck to release gate"
```

---

### Task 3: Split `useLibraryAdminState` Into Orchestrator + Asset Domains

**Files:**
- Create: `frontend/src/features/library/useLibraryAssetCrudActions.ts`
- Create: `frontend/src/features/library/useLibraryAssetEditorActions.ts`
- Create: `frontend/src/features/library/useLibraryPanelSections.ts`
- Modify: `frontend/src/features/library/useLibraryAdminState.ts`
- Create: `frontend/test/library-admin-asset-crud.test.ts`
- Create: `frontend/test/library-admin-asset-editor.test.ts`
- Modify: `frontend/test/library-admin-layout.test.ts`

**Step 1: Write failing tests for new composables**

Example (`library-admin-asset-crud.test.ts`):
```ts
import { describe, expect, it } from "vitest";
import { useLibraryAssetCrudActions } from "../src/features/library/useLibraryAssetCrudActions";

describe("useLibraryAssetCrudActions", () => {
  it("exposes uploadAssetEntry and switchAssetOpenMode", () => {
    expect(typeof useLibraryAssetCrudActions).toBe("function");
  });
});
```

**Step 2: Run tests and verify RED**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm test -- test/library-admin-asset-crud.test.ts test/library-admin-asset-editor.test.ts
```

Expected: FAIL with missing module/function.

**Step 3: Implement minimal composable shells and wire from admin state**

`useLibraryAssetCrudActions.ts` exports only required refs/actions; `useLibraryAdminState.ts` delegates by dependency injection,保持 return API 不变。

**Step 4: Run targeted tests and previous library admin tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm test -- test/library-admin-asset-crud.test.ts test/library-admin-asset-editor.test.ts test/library-admin-layout.test.ts test/library-admin-upload.test.ts test/library-admin-state-size.test.ts
```

Expected: PASS.

**Step 5: Run full frontend verification**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm test
npm run build
```

Expected: PASS.

**Step 6: Commit**

```bash
git add frontend/src/features/library/useLibraryAssetCrudActions.ts frontend/src/features/library/useLibraryAssetEditorActions.ts frontend/src/features/library/useLibraryPanelSections.ts frontend/src/features/library/useLibraryAdminState.ts frontend/test/library-admin-asset-crud.test.ts frontend/test/library-admin-asset-editor.test.ts frontend/test/library-admin-layout.test.ts
git commit -m "refactor(library-admin): split admin state into asset composables"
```

---

### Task 4: Split Library Routes by Domain (Folders/Assets/Profiles/Catalog)

**Files:**
- Create: `server/routes/library/catalogRoutes.js`
- Create: `server/routes/library/folderRoutes.js`
- Create: `server/routes/library/assetRoutes.js`
- Create: `server/routes/library/embedProfileRoutes.js`
- Create: `server/routes/library/shared.js`
- Modify: `server/routes/library.js`
- Modify: `tests/library-route-api.test.js`
- Modify: `tests/library-route-size.test.js`

**Step 1: Write failing route composition test**

Add assertion in `tests/library-route-api.test.js` for composed subrouter imports (string check or behavior check via API boot).

**Step 2: Run tests and verify RED**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/library-route-api.test.js tests/library-route-size.test.js
```

Expected: FAIL.

**Step 3: Implement shared helpers + split route registration**

`shared.js`:
```js
function sendServiceResult(res, result, okBody) { /* extracted from current file */ }
function parseEmbedOptionsJson(rawValue) { /* extracted from current file */ }
module.exports = { sendServiceResult, parseEmbedOptionsJson };
```

Each domain file exports `registerXxxRoutes({ router, service, authRequired, rateLimit, upload, parseWithSchema, idSchema, schemas })`.

**Step 4: Shrink `server/routes/library.js` to composition-only shell**

`library.js` 保留 `createLibraryRouter` 组装逻辑和依赖注入，不再承载全部 endpoint 细节。

**Step 5: Run route tests (RED->GREEN)**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/library-route-api.test.js tests/library-route-size.test.js
npm test
```

Expected: PASS.

**Step 6: Commit**

```bash
git add server/routes/library.js server/routes/library/*.js tests/library-route-api.test.js tests/library-route-size.test.js
git commit -m "refactor(library): split router by domain submodules"
```

---

### Task 5: Formalize Adapter Extension Contract

**Files:**
- Create: `server/services/library/adapters/contract.js`
- Modify: `server/services/library/adapters/registry.js`
- Modify: `server/services/library/adapters/geogebra.js`
- Modify: `server/services/library/adapters/phet.js`
- Create: `tests/library-adapter-contract.test.js`

**Step 1: Write failing contract tests**

```js
test("registry rejects adapter without contract fields", () => {
  const { createAdapterRegistry } = require("../server/services/library/adapters/registry");
  const registry = createAdapterRegistry([{ key: "x", match: () => true }]);
  assert.equal(registry.adapters.length, 0);
});
```

Expected contract fields:
- `key`
- `match(input)`
- `capabilities` (`supportsEmbed`, `supportsDownload`)
- `buildViewer()`

**Step 2: Run tests and verify RED**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/library-adapter-contract.test.js
```

Expected: FAIL.

**Step 3: Implement contract validator and registry enforcement**

`contract.js`:
```js
function isValidAdapter(adapter) {
  return Boolean(
    adapter &&
    typeof adapter.key === "string" &&
    adapter.key.trim() &&
    typeof adapter.match === "function" &&
    adapter.capabilities &&
    typeof adapter.capabilities.supportsEmbed === "boolean" &&
    typeof adapter.capabilities.supportsDownload === "boolean" &&
    typeof adapter.buildViewer === "function"
  );
}
module.exports = { isValidAdapter };
```

**Step 4: Update built-in adapters to satisfy contract**

在 `geogebra.js`/`phet.js` 添加 `capabilities` 字段。

**Step 5: Run adapter + library service tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/library-adapter-contract.test.js tests/library-adapter-registry.test.js tests/library-geogebra-adapter.test.js tests/library-phet-adapter.test.js tests/library-service.test.js
```

Expected: PASS.

**Step 6: Commit**

```bash
git add server/services/library/adapters/contract.js server/services/library/adapters/registry.js server/services/library/adapters/geogebra.js server/services/library/adapters/phet.js tests/library-adapter-contract.test.js
git commit -m "refactor(library-adapters): enforce adapter extension contract"
```

---

### Task 6: Split `sqliteMirror.js` Into Focused Modules

**Files:**
- Create: `server/lib/stateDb/sqliteMirror/queryRunner.js`
- Create: `server/lib/stateDb/sqliteMirror/circuitGuard.js`
- Create: `server/lib/stateDb/sqliteMirror/sqlBuilders.js`
- Modify: `server/lib/stateDb/sqliteMirror.js`
- Modify: `tests/state-db-sqlite-mirror.test.js`
- Modify: `tests/state-db-circuit-breaker.test.js`
- Modify: `tests/state-db-circuit-state.test.js`
- Modify: `tests/state-db-sqlite-mirror-size.test.js`

**Step 1: Write failing import/behavior tests for extracted modules**

Example:
```js
test("createCircuitGuard opens after max errors", async () => {
  const { createCircuitGuard } = require("../server/lib/stateDb/sqliteMirror/circuitGuard");
  assert.equal(typeof createCircuitGuard, "function");
});
```

**Step 2: Run tests and verify RED**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-circuit-breaker.test.js tests/state-db-sqlite-mirror-size.test.js
```

Expected: FAIL.

**Step 3: Implement module extraction with zero behavior drift**

- `sqlBuilders.js`: SQL 语句拼装
- `queryRunner.js`: 执行 + 错误映射
- `circuitGuard.js`: 熔断状态与恢复计时
- `sqliteMirror.js`: orchestration only

**Step 4: Run focused + full backend tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/state-db-*.test.js
npm test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/lib/stateDb/sqliteMirror.js server/lib/stateDb/sqliteMirror/*.js tests/state-db-sqlite-mirror.test.js tests/state-db-circuit-breaker.test.js tests/state-db-circuit-state.test.js tests/state-db-sqlite-mirror-size.test.js
git commit -m "refactor(state-db): split sqlite mirror into focused modules"
```

---

### Task 7: Document Extensibility DoD + PR Checklist

**Files:**
- Create: `docs/guides/maintainability-extensibility-dod.md`
- Modify: `docs/README.md`
- Modify: `README.md`

**Step 1: Write failing docs linkage test**

Extend `tests/ops-docs.test.js` to assert new guide is linked from docs index.

```js
assert.match(docsReadme, /maintainability-extensibility-dod/i);
```

**Step 2: Run tests and verify RED**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/ops-docs.test.js
```

Expected: FAIL.

**Step 3: Add DoD checklist document**

Checklist must require for every extensibility change:
- contract/test update
- migration/backward-compat note
- rollback plan
- release-gate evidence

**Step 4: Link doc in root and docs index**

`docs/README.md` and `README.md` add direct entry.

**Step 5: Run docs tests and release gate**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/ops-docs.test.js
npm run qa:release
```

Expected: PASS.

**Step 6: Commit**

```bash
git add docs/guides/maintainability-extensibility-dod.md docs/README.md README.md tests/ops-docs.test.js
git commit -m "docs(maintainability): add extensibility definition-of-done checklist"
```

---

## Final Verification (Mandatory Before Merge)

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
npm test
npm --prefix frontend run test
npm --prefix frontend run build
npm run qa:release
```

Expected: all PASS.

## Merge Criteria

- `useLibraryAdminState.ts` < 500 lines
- `server/routes/library.js` < 340 lines
- `server/lib/stateDb/sqliteMirror.js` < 620 lines
- Guardrail tests green
- Adapter contract tests green
- Docs linkage tests green

