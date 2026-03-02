# Compatibility Removal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove backward-compatibility branches for storage mode and items read fallbacks, keeping only explicit `local|webdav` behavior and SQL-only item reads.

**Architecture:** Tighten storage mode contracts at backend/frontend boundaries, delete alias and runtime fallback branches, and reduce items read path to a single query-port flow. Keep failure explicit (`invalid_storage_mode`, `state_db_unavailable`) instead of silent degradation.

**Tech Stack:** Node.js (Express), Vue 3 + TypeScript, Node test runner (`node --test`), Vitest.

---

### Task 1: Storage Mode Contract Tightening (`local|webdav` only)

**Files:**
- Modify: `tests/system-state.test.js`
- Modify: `tests/content-store-config-priority.test.js`
- Modify: `server/lib/systemState.js`
- Modify: `server/routes/system.js`
- Modify: `server/lib/contentStore.js`

**Step 1: Write failing tests**
- Add assertions that:
  - `POST /api/system/storage` rejects `hybrid`, `mirror`, `local+webdav`.
  - `POST /api/system/storage` rejects empty/invalid mode instead of inferring.
  - `createContentStore` does not auto-promote to `hybrid` from env.

**Step 2: Run targeted tests (expect RED)**
- `node --test tests/system-state.test.js tests/content-store-config-priority.test.js`

**Step 3: Minimal implementation**
- In `server/lib/systemState.js`, `normalizeMode` accepts only `local|webdav`.
- In `server/routes/system.js`, `isRemoteMode` only treats `webdav` as remote.
- In `server/lib/contentStore.js`:
  - remove alias normalization (`hybrid`, `mirror`, `local+webdav`);
  - remove auto mode inference (`hasWebdav ? hybrid : local`);
  - keep explicit branch for `local` and `webdav`;
  - remove silent fallback behavior tied to hybrid mode.

**Step 4: Re-run targeted tests (expect GREEN)**
- `node --test tests/system-state.test.js tests/content-store-config-priority.test.js`

**Step 5: Commit**
- `git add ...`
- `git commit -m "refactor(storage): enforce explicit local/webdav mode contract"`

### Task 2: Frontend Admin Wizard Mode Simplification

**Files:**
- Modify: `frontend/test/system-form-state.test.ts`
- Modify: `frontend/src/features/admin/systemFormState.ts`
- Modify: `frontend/src/views/admin/system/SystemWizardSteps.vue`
- Modify: `frontend/test/admin-content-api.test.ts`

**Step 1: Write failing tests**
- Update tests to require:
  - `normalizeUiMode("hybrid") -> "local"` (or reject path as local fallback).
  - `shouldRequireWebdavUrl` and `isRemoteMode` true only for `webdav`.
  - payload mode in tests uses `local|webdav` only.

**Step 2: Run targeted tests (expect RED)**
- `npm run test:frontend -- system-form-state admin-content-api`

**Step 3: Minimal implementation**
- Remove hybrid alias mapping in `systemFormState.ts`.
- Remove hybrid radio card in `SystemWizardSteps.vue`.
- Ensure wizard copy and logic describe only `local` and `webdav`.

**Step 4: Re-run targeted tests (expect GREEN)**
- `npm run test:frontend -- system-form-state admin-content-api`

**Step 5: Commit**
- `git add ...`
- `git commit -m "refactor(frontend): drop hybrid mode from admin storage wizard"`

### Task 3: Items Read Service Single-Path Query Port

**Files:**
- Modify: `tests/items-read-service.test.js`
- Modify: `tests/items-split-sql-fallback-pagination.test.js`
- Modify: `tests/items-builtin-sql-path.test.js`
- Modify: `server/services/items/readService.js`
- Modify: `server/ports/queryRepos.js`

**Step 1: Write failing tests**
- Add/adjust tests to enforce:
  - list path uses `queryItems` only;
  - when SQL query fails, return `{ status: 503, error: "state_db_unavailable" }`;
  - no in-memory/builtin fallback branch is executed.

**Step 2: Run targeted tests (expect RED)**
- `node --test tests/items-read-service.test.js tests/items-split-sql-fallback-pagination.test.js tests/items-builtin-sql-path.test.js`

**Step 3: Minimal implementation**
- Simplify `readService.listItems`:
  - require `queryItems`;
  - direct pass-through to one query function;
  - SQL error -> 503.
- Simplify `getItemById`:
  - use query-port lookup only; on failure return 503.
- Simplify `createQueryReposFromStore` exported shape to merged-query methods only.

**Step 4: Re-run targeted tests (expect GREEN)**
- `node --test tests/items-read-service.test.js tests/items-split-sql-fallback-pagination.test.js tests/items-builtin-sql-path.test.js`

**Step 5: Commit**
- `git add ...`
- `git commit -m "refactor(items): remove read fallbacks and keep SQL-only query path"`

### Task 4: Remove Dead Compatibility Artifacts + Docs Alignment

**Files:**
- Delete: `tests/hybrid-store-fallback.test.js`
- Modify: `tests/content-store-size.test.js`
- Modify: `tests/configuration-doc-storage-mode.test.js`
- Modify: `docs/guides/configuration.md`
- Modify: `docs/guides/api.md`
- Modify: `docs/guides/deployment.md`

**Step 1: Write failing docs/tests**
- Update assertions to require docs mention only `local|webdav`.
- Remove references to `hybrid` default inference.

**Step 2: Run targeted checks (expect RED)**
- `node --test tests/content-store-size.test.js tests/configuration-doc-storage-mode.test.js`

**Step 3: Minimal implementation**
- Remove obsolete hybrid-specific tests and references.
- Update docs to explicit break:
  - no alias modes;
  - no auto mode inference;
  - migration notes for old deployments.

**Step 4: Re-run targeted checks (expect GREEN)**
- `node --test tests/content-store-size.test.js tests/configuration-doc-storage-mode.test.js`

**Step 5: Commit**
- `git add ...`
- `git commit -m "docs: align storage guidance with no-compat local/webdav model"`

### Task 5: Full Verification Gate

**Files:**
- None (verification only)

**Step 1: Run full backend tests**
- `npm test`

**Step 2: Run frontend tests**
- `npm run test:frontend`

**Step 3: Sanity lint/check scripts (if configured)**
- `npm run check:file-lines`
- `npm run check:security`

**Step 4: Commit final cleanups (if any)**
- `git add ...`
- `git commit -m "chore: finalize compatibility-removal implementation"`

**Step 5: Push**
- `git push -u origin codex/compat-clean`
