# Code Splitting and Modularization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split oversized high-coupling files into focused modules/components without changing product behavior.

**Architecture:** Use a strangler-style refactor with stable facades. Keep existing route/service entry files as orchestration layers, move logic into composables/services/helpers behind unchanged public APIs, and migrate brittle source-text tests to behavior-driven tests in small increments.

**Tech Stack:** Vue 3 + TypeScript + Vitest (frontend), Node.js + Express + node:test (backend), ripgrep for static checks.

---

## Scope and Priority

### Priority P0 (split first)
- `frontend/src/views/admin/AdminLibraryView.vue` (2286 LOC, multi-domain UI + state + API orchestration)
- `server/services/library/libraryService.js` (1421 LOC, embed/folder/asset workflows in one file)
- `server/lib/stateDb.js` (981 LOC, duplicated sqlite mirror logic + orchestration mixed)

### Priority P1 (split second)
- `frontend/src/views/admin/AdminTaxonomyView.vue` (1031 LOC)
- `frontend/src/views/admin/AdminSystemView.vue` (727 LOC)
- `frontend/src/views/admin/AdminUploadsView.vue` (672 LOC)
- `frontend/src/views/admin/AdminContentView.vue` (645 LOC)
- `server/lib/stateDb/sqliteMirror.js` (791 LOC, internal split after dedupe)

### Out of Scope
- Feature changes, UI redesign, API contract changes.
- Data model migration.

---

### Task 1: Baseline Guardrails (Do First)

**Files:**
- Create: `tests/split-plan-baseline.test.js`
- Test: `tests/*.test.js`, `frontend/test/*.test.ts`

**Step 1: Add baseline assertions file**
- Add a backend smoke test that only checks runtime contracts used by split refactors:
  - `createLibraryService` returns all existing method keys.
  - `createStateDbStore` still returns `{ store, info }`.

**Step 2: Run backend tests**
- Run: `npm test`
- Expected: PASS (existing baseline remains green).

**Step 3: Run targeted frontend tests that currently validate admin view structure**
- Run: `npm --prefix frontend test -- --run test/library-admin-layout.test.ts test/library-admin-upload.test.ts test/admin-style-semantics.test.ts test/admin-inline-feedback.test.ts`
- Expected: existing failures remain unchanged; no new failures added by baseline test creation.

**Step 4: Commit**
- `git add tests/split-plan-baseline.test.js`
- `git commit -m "test(refactor): add split baseline contract checks"`

---

### Task 2: Extract Shared Admin Composables (Low-risk foundation)

**Files:**
- Create:
  - `frontend/src/features/admin/composables/useFieldErrors.ts`
  - `frontend/src/features/admin/composables/useActionFeedback.ts`
  - `frontend/src/features/admin/composables/usePagedAdminList.ts`
- Modify:
  - `frontend/src/views/admin/AdminContentView.vue`
  - `frontend/src/views/admin/AdminUploadsView.vue`
- Test:
  - `frontend/test/admin-inline-feedback.test.ts`
  - `frontend/test/admin-style-semantics.test.ts`
  - `frontend/test/catalog-link.test.ts`

**Step 1: Write failing unit tests for new composables**
- Create focused tests for field error set/clear/get and feedback success/error modes.

**Step 2: Implement minimal composables**
- Keep return shape simple and explicit.

**Step 3: Replace duplicated local helper functions in Content/Uploads views**
- Replace local `setFieldError/clearFieldErrors/getFieldError`.
- Replace local `setActionFeedback`.
- Keep template class names unchanged.

**Step 4: Verify**
- Run: `npm --prefix frontend test -- --run test/admin-inline-feedback.test.ts test/admin-style-semantics.test.ts`
- Expected: no regression in inline validation semantics.

**Step 5: Commit**
- `git add frontend/src/features/admin/composables frontend/src/views/admin/AdminContentView.vue frontend/src/views/admin/AdminUploadsView.vue frontend/test`
- `git commit -m "refactor(admin): extract shared form feedback composables"`

---

### Task 3: Split `AdminContentView.vue` and `AdminUploadsView.vue`

**Files:**
- Create:
  - `frontend/src/views/admin/content/ContentCreateForm.vue`
  - `frontend/src/views/admin/content/ContentListPanel.vue`
  - `frontend/src/views/admin/content/ContentEditPanel.vue`
  - `frontend/src/views/admin/uploads/UploadsCreateForm.vue`
  - `frontend/src/views/admin/uploads/UploadsListPanel.vue`
  - `frontend/src/views/admin/uploads/UploadsEditPanel.vue`
  - `frontend/src/features/admin/content/useContentAdmin.ts`
  - `frontend/src/features/admin/uploads/useUploadAdmin.ts`
- Modify:
  - `frontend/src/views/admin/AdminContentView.vue`
  - `frontend/src/views/admin/AdminUploadsView.vue`
- Test:
  - `frontend/test/admin-edit-panel-layout.test.ts`
  - `frontend/test/admin-preview-default-open.test.ts`
  - `frontend/test/ui-interaction-guardrails.test.ts`

**Step 1: Add failing tests for composable-level state transitions**
- e.g. selecting item -> editor model populated; resetting clears selection.

**Step 2: Move state + async actions to composables**
- Keep view files as composition shell + template composition.

**Step 3: Split template into 3 subcomponents per page**
- Props/events only; no API calls in presentational components.

**Step 4: Update existing source-text tests gradually**
- Keep compatibility by preserving critical class names (`admin-card`, `field-error-text`, etc.).

**Step 5: Verify**
- Run: `npm --prefix frontend test -- --run test/admin-edit-panel-layout.test.ts test/admin-preview-default-open.test.ts test/ui-interaction-guardrails.test.ts`

**Step 6: Commit**
- `git add frontend/src/views/admin/content frontend/src/views/admin/uploads frontend/src/features/admin/content frontend/src/features/admin/uploads frontend/src/views/admin/AdminContentView.vue frontend/src/views/admin/AdminUploadsView.vue frontend/test`
- `git commit -m "refactor(admin): split content/uploads pages into composables and panels"`

---

### Task 4: Split `AdminLibraryView.vue` (largest frontend hotspot)

**Files:**
- Create:
  - `frontend/src/views/admin/library/LibraryFolderColumn.vue`
  - `frontend/src/views/admin/library/LibraryAssetColumn.vue`
  - `frontend/src/views/admin/library/LibraryInspectorColumn.vue`
  - `frontend/src/views/admin/library/panels/FolderPanel.vue`
  - `frontend/src/views/admin/library/panels/AssetPanel.vue`
  - `frontend/src/views/admin/library/panels/EmbedPanel.vue`
  - `frontend/src/views/admin/library/panels/OperationLogPanel.vue`
  - `frontend/src/features/library/useLibraryAdminState.ts`
  - `frontend/src/features/library/useLibraryFolderActions.ts`
  - `frontend/src/features/library/useLibraryAssetActions.ts`
  - `frontend/src/features/library/useLibraryEmbedProfileActions.ts`
- Modify:
  - `frontend/src/views/admin/AdminLibraryView.vue`
  - `frontend/test/library-admin-layout.test.ts`
  - `frontend/test/library-admin-upload.test.ts`
- Test:
  - `frontend/test/library-admin-layout.test.ts`
  - `frontend/test/library-admin-upload.test.ts`
  - `frontend/test/library-api.test.ts`

**Step 1: Introduce façade composable (`useLibraryAdminState`)**
- Move refs/computed/watch and route lifecycle code there.
- Keep public method names unchanged to minimize template churn.

**Step 2: Extract columns first, then panel internals**
- Phase A: split 3 workbench columns.
- Phase B: split folder/asset/embed/log panels.

**Step 3: Keep contract CSS hooks stable**
- Preserve hooks used by tests (`library-workbench`, `library-column-*`, `panel-section-toggle`, `asset-batch-toolbar`, etc.).

**Step 4: Convert brittle source-string tests to behavior tests**
- Add interaction tests for tab switching, batch operations, and error surfaces.
- Remove strict dependency on single-file source text once behavior tests are in place.

**Step 5: Verify**
- Run: `npm --prefix frontend test -- --run test/library-admin-layout.test.ts test/library-admin-upload.test.ts test/library-api.test.ts`

**Step 6: Commit**
- `git add frontend/src/views/admin/library frontend/src/features/library/useLibrary*.ts frontend/src/views/admin/AdminLibraryView.vue frontend/test`
- `git commit -m "refactor(admin-library): split monolithic view into modular columns and action composables"`

---

### Task 5: Split `libraryService.js` by domain

**Files:**
- Create:
  - `server/services/library/core/normalizers.js`
  - `server/services/library/core/embedProfileSync.js`
  - `server/services/library/foldersService.js`
  - `server/services/library/assetsService.js`
  - `server/services/library/embedProfilesService.js`
  - `server/services/library/viewerRenderService.js`
- Modify:
  - `server/services/library/libraryService.js`
  - `tests/library-service.test.js`
  - `tests/library-route-api.test.js`
- Test:
  - `tests/library-service.test.js`
  - `tests/library-route-api.test.js`
  - `tests/library-adapter-registry.test.js`

**Step 1: Write failing contract tests for service surface**
- Assert returned method keys and representative error codes remain unchanged.

**Step 2: Move pure helpers first**
- Normalizers, URL/path guards, parser helpers extracted to `core/normalizers.js`.

**Step 3: Move embed profile sync pipeline**
- Extract remote fetch + mirror + sync-status state transitions to `core/embedProfileSync.js`.

**Step 4: Move folder and asset workflows**
- Folder CRUD and cover upload -> `foldersService.js`.
- Asset upload/open/update/delete/restore -> `assetsService.js`.

**Step 5: Keep `createLibraryService` as orchestrator façade**
- It wires dependencies and re-exports same method names.

**Step 6: Verify**
- Run: `npm test -- tests/library-service.test.js tests/library-route-api.test.js`

**Step 7: Commit**
- `git add server/services/library tests/library-service.test.js tests/library-route-api.test.js`
- `git commit -m "refactor(library-service): split embed/folder/asset domains behind stable facade"`

---

### Task 6: Deduplicate and Split State DB Layer

**Files:**
- Create:
  - `server/lib/stateDb/mirrorHelpers.js`
  - `server/lib/stateDb/storeFactory.js`
- Modify:
  - `server/lib/stateDb.js`
  - `server/lib/stateDb/sqliteMirror.js`
  - `tests/state-db-query-items.test.js`
  - `tests/state-db-sqlite-mirror.test.js`
- Test:
  - `tests/state-db-query-items.test.js`
  - `tests/state-db-sqlite-mirror.test.js`
  - `tests/state-db-circuit-breaker.test.js`

**Step 1: Add parity tests for duplicated logic**
- Pin expected behavior for `normalizeStateDbMode` and mirror query semantics.

**Step 2: Remove duplicated local sqlite mirror implementation from `stateDb.js`**
- `stateDb.js` becomes orchestrator only:
  - mode resolution
  - circuit guard
  - wrapped store wiring

**Step 3: Keep sqlite details in `sqliteMirror.js` and helpers**
- Query builders and row mappers stay near mirror code.

**Step 4: Verify**
- Run:
  - `npm test -- tests/state-db-query-items.test.js tests/state-db-sqlite-mirror.test.js tests/state-db-circuit-breaker.test.js`

**Step 5: Commit**
- `git add server/lib/stateDb.js server/lib/stateDb tests/state-db-query-items.test.js tests/state-db-sqlite-mirror.test.js tests/state-db-circuit-breaker.test.js`
- `git commit -m "refactor(state-db): remove duplicated mirror code and isolate store wiring"`

---

### Task 7: Split Remaining Admin Heavy Views (`Taxonomy`, `System`)

**Files:**
- Create:
  - `frontend/src/views/admin/taxonomy/TaxonomyTreePanel.vue`
  - `frontend/src/views/admin/taxonomy/GroupEditorPanel.vue`
  - `frontend/src/views/admin/taxonomy/CategoryEditorPanel.vue`
  - `frontend/src/features/admin/taxonomy/useTaxonomyAdmin.ts`
  - `frontend/src/views/admin/system/SystemWizardSteps.vue`
  - `frontend/src/views/admin/system/SystemStatusPanel.vue`
  - `frontend/src/features/admin/system/useSystemWizard.ts`
- Modify:
  - `frontend/src/views/admin/AdminTaxonomyView.vue`
  - `frontend/src/views/admin/AdminSystemView.vue`
  - `frontend/test/admin-taxonomy-feedback.test.ts`
  - `frontend/test/admin-system-feedback-hints.test.ts`
- Test:
  - `frontend/test/admin-taxonomy-feedback.test.ts`
  - `frontend/test/admin-system-feedback-hints.test.ts`
  - `frontend/test/admin-system-responsive.test.ts`

**Step 1: Extract page-level composables**
- Keep persistence logic (`localStorage`) and wizard transitions in composables.

**Step 2: Extract panel components**
- Tree + editors for taxonomy; status + steps for system.

**Step 3: Verify**
- Run: `npm --prefix frontend test -- --run test/admin-taxonomy-feedback.test.ts test/admin-system-feedback-hints.test.ts test/admin-system-responsive.test.ts`

**Step 4: Commit**
- `git add frontend/src/views/admin/taxonomy frontend/src/views/admin/system frontend/src/features/admin/taxonomy frontend/src/features/admin/system frontend/src/views/admin/AdminTaxonomyView.vue frontend/src/views/admin/AdminSystemView.vue frontend/test`
- `git commit -m "refactor(admin): split taxonomy/system views into wizard and panel modules"`

---

### Task 8: Final Verification and Clean Contract Update

**Files:**
- Modify:
  - `docs/architecture/backend-query-ports.md`
  - `docs/guides/spa-and-frontend.md`
  - `README.md`
- Test:
  - full backend + frontend suites

**Step 1: Run full backend tests**
- Run: `npm test`
- Expected: PASS.

**Step 2: Run full frontend tests**
- Run: `npm --prefix frontend test -- --run`
- Expected: PASS or only pre-existing known failures documented.

**Step 3: Run release gate**
- Run: `npm run qa:release`
- Expected: gate completes with current policy.

**Step 4: Update docs**
- Reflect new module boundaries and maintenance guidelines (target max file size and domain boundaries).

**Step 5: Commit**
- `git add docs README.md`
- `git commit -m "docs: document post-split module boundaries and maintenance guardrails"`

---

## Success Criteria

- No file in `frontend/src/views/admin` exceeds 700 LOC.
- No file in `server/services/library` exceeds 500 LOC.
- `server/lib/stateDb.js` is orchestration-only and does not contain mirror SQL implementation.
- Existing API and UI behavior remains unchanged (contract tests green).
- Source-text brittle tests are either migrated to behavior tests or reduced in scope.

## Recommended Execution Order

1. Task 1 → Task 2 → Task 3  
2. Task 4 (largest risk on frontend)  
3. Task 5 (backend service split)  
4. Task 6 (state-db dedupe)  
5. Task 7 → Task 8

---

## Execution Notes (2026-02-27)

- Task 1-3: 已完成并通过回归；拆分后的 admin source-text 测试已改为“视图 + 子组件/状态模块”联合断言，降低单文件耦合。
- Task 4:
  - `useLibraryAdminState.ts` 已落地，`AdminLibraryView.vue` 状态/动作逻辑迁移到 façade composable。
  - `library/*` 列组件与 `library/panels/*` 面板组件壳层已建立并接入。
  - `AdminLibraryView.vue` 模板和样式已外置到 `library/AdminLibraryView.template.html` 与 `library/AdminLibraryView.css`。
  - 验证通过：`frontend test -- --run test/library-admin-layout.test.ts test/library-admin-upload.test.ts test/library-api.test.ts`、`frontend build`。
- Task 5:
  - Step 2-5 已推进：`libraryService` 相关域逻辑已完成拆分：
    - `server/services/library/core/normalizers.js`
    - `server/services/library/core/embedProfileSync.js`
    - `server/services/library/viewerRenderService.js`
    - `server/services/library/embedProfilesService.js`
    - `server/services/library/foldersService.js`
    - `server/services/library/assetsService.js`
  - `server/services/library/libraryService.js` 已收敛为编排 façade（当前 114 LOC），仅负责依赖装配与稳定 API 导出。
  - 验证通过：`npm test -- tests/library-service.test.js tests/library-route-api.test.js`（全套 node:test：148 pass / 0 fail）。
- Task 6:
  - 新增 `server/lib/stateDb/mirrorHelpers.js`，统一承载 state-db/sqlite mirror 的共享 helper（mode/key/path/解析/签名函数）。
  - 新增 `server/lib/stateDb/storeFactory.js`，承接 `createStateDbStore` 装配逻辑；`server/lib/stateDb.js` 收敛为 façade 导出。
  - `server/lib/stateDb/sqliteMirror.js` 改为依赖 `mirrorHelpers`，删除重复 helper 实现（文件从 790 LOC 降至 638 LOC）。
  - 补充结构测试：`tests/state-db-sqlite-mirror.test.js` 断言 `stateDb.js` 不再内置 `createSqliteMirror/normalizeStateDbMode` 实现。
  - 验证通过：`npm test -- tests/state-db-query-items.test.js tests/state-db-sqlite-mirror.test.js tests/state-db-circuit-breaker.test.js`（全套 node:test：149 pass / 0 fail）。
- Task 7:
  - Taxonomy：新增 `frontend/src/features/admin/taxonomy/useTaxonomyAdmin.ts`，将状态、列表/筛选、CRUD 与本地 UI 持久化迁入 composable。
  - Taxonomy：新增并接入
    - `frontend/src/views/admin/taxonomy/TaxonomyTreePanel.vue`
    - `frontend/src/views/admin/taxonomy/GroupEditorPanel.vue`
    - `frontend/src/views/admin/taxonomy/CategoryEditorPanel.vue`
    - `frontend/src/views/admin/AdminTaxonomyView.vue` 收敛为壳层编排。
  - System：新增 `frontend/src/features/admin/system/useSystemWizard.ts`，迁移向导流程状态、校验/保存/同步动作以及路由离开保护逻辑。
  - System：新增并接入
    - `frontend/src/views/admin/system/SystemStatusPanel.vue`
    - `frontend/src/views/admin/system/SystemWizardSteps.vue`
    - `frontend/src/views/admin/AdminSystemView.vue` 收敛为壳层编排。
  - 前端拆分契约测试升级为“跨文件联合断言”：
    - `frontend/test/admin-taxonomy-feedback.test.ts`
    - `frontend/test/admin-system-feedback-hints.test.ts`
    - `frontend/test/admin-system-responsive.test.ts`
    - 同步修正受影响断言：
      - `frontend/test/admin-inline-feedback.test.ts`
      - `frontend/test/admin-style-semantics.test.ts`
  - 验证通过：
    - `npm --prefix frontend test -- --run test/admin-taxonomy-feedback.test.ts test/admin-system-feedback-hints.test.ts test/admin-system-responsive.test.ts`
    - `npm --prefix frontend test -- --run test/admin-inline-feedback.test.ts test/admin-style-semantics.test.ts test/ui-interaction-guardrails.test.ts test/admin-taxonomy-feedback.test.ts test/admin-system-feedback-hints.test.ts test/admin-system-responsive.test.ts`
    - `npm --prefix frontend run build`
- Task 8:
  - 全量验证通过：
    - `npm test`（node:test：149 pass / 0 fail）
    - `npm --prefix frontend test -- --run`（vitest：37 files / 115 tests 全通过）
    - `npm run qa:release`（release gate 全部通过，含 smoke: public/admin/admin-write/library-admin）
  - 文档已更新：
    - `docs/architecture/backend-query-ports.md`
    - `docs/guides/spa-and-frontend.md`
    - `README.md`
  - 文档新增内容包含：
    - 前后端拆分后的模块边界
    - 入口 façade / 领域服务职责约束
    - 文件体积维护守则（admin view ~700 LOC，library service ~500 LOC）
- 待继续：
  - 当前计划项已全部完成，待评审与集成。
