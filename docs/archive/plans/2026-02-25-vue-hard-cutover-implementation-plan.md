# Vue Hard Cutover Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete a one-time hard cutover so the app serves only the Vue SPA from `/`, with all legacy frontend entry points removed and returning 404.

**Architecture:** Keep backend APIs/data model unchanged, but change server routing to a single SPA entry mode. Replace `/app`-based SPA mounting with root-based mounting, block legacy frontend URLs, and delete legacy frontend files/scripts/docs. Keep smoke and unit tests aligned with the new routing contract.

**Tech Stack:** Node.js, Express, Vue 3, Vite, TypeScript, Vitest, node:test, Playwright smoke scripts.

---

### Task 1: Define hard-cutover route behavior with failing backend tests

**Files:**
- Modify: `tests/spa-entry-routes.test.js`
- Test: `tests/spa-entry-routes.test.js`

**Step 1: Write the failing test**

Add/replace coverage to assert:
- `GET /` serves SPA entry when `frontend/dist/index.html` exists.
- `GET /viewer/demo` serves SPA entry (history fallback).
- `GET /assets/app.js` serves from `frontend/dist/assets`.
- `GET /index.html`, `GET /viewer.html`, `GET /app`, `GET /app/viewer/demo` return `404 { error: "not_found" }`.
- If SPA dist is missing, `GET /` returns `503 { error: "service_unavailable" }`.

**Step 2: Run test to verify it fails**

Run: `node --test tests/spa-entry-routes.test.js`  
Expected: FAIL because current app still supports `/app` and legacy fallback behavior.

**Step 3: Commit (tests only)**

```bash
git add tests/spa-entry-routes.test.js
git commit -m "test(server): define hard cutover route contract"
```

### Task 2: Implement server-side hard cutover routing

**Files:**
- Modify: `server/app.js`
- Test: `tests/spa-entry-routes.test.js`

**Step 1: Write minimal implementation**

Change routing to:
- Serve SPA assets from `frontend/dist/assets` on `/assets`.
- Serve SPA entry for `/` and non-API frontend routes (`/viewer/*`, `/admin/*`, etc.).
- Explicitly block legacy frontend URLs (`/index.html`, `/viewer.html`, `/app`, `/app/*`) with 404 JSON.
- Return `503 { error: "service_unavailable" }` if SPA entry file is missing.
- Remove `SPA_DEFAULT_ENTRY` runtime switching behavior.

**Step 2: Run target test**

Run: `node --test tests/spa-entry-routes.test.js`  
Expected: PASS.

**Step 3: Commit**

```bash
git add server/app.js tests/spa-entry-routes.test.js
git commit -m "feat(server): hard cutover to root vue spa entry"
```

### Task 3: Migrate frontend/runtime assumptions from `/app` to `/`

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/views/admin/AdminContentView.vue`
- Modify: `frontend/src/views/admin/AdminUploadsView.vue`
- Modify: `frontend/test/router-guard.test.ts`
- Modify: `server/lib/catalog.js`
- Test: `frontend/test/router-guard.test.ts`

**Step 1: Add/adjust failing tests first**

Ensure router/admin tests use root history base (`/`) and still preserve auth-guard behavior.

**Step 2: Implement minimal changes**

- Set Vite base to `/`.
- Update admin preview link builders to default to `/` instead of `/app/`.
- Update catalog href generation in backend from `viewer.html?id=...` to `/viewer/:id`.

**Step 3: Verify frontend/backend tests**

Run:
- `npm run test:frontend -- --run`
- `node --test tests/catalog-sql-query.test.js`

Expected: PASS.

**Step 4: Commit**

```bash
git add frontend/vite.config.ts frontend/src/views/admin/AdminContentView.vue frontend/src/views/admin/AdminUploadsView.vue frontend/test/router-guard.test.ts server/lib/catalog.js
git commit -m "refactor(frontend): remove app-prefix assumptions"
```

### Task 4: Update smoke scripts and CI pipeline for hard cutover

**Files:**
- Modify: `scripts/smoke_spa_admin.js`
- Modify: `scripts/smoke_spa_admin_writepath.js`
- Modify: `scripts/smoke_spa_public.js`
- Delete: `scripts/smoke_spa_legacy_fallback.js`
- Modify: `package.json`
- Modify: `.github/workflows/docker-image.yml`
- Test: smoke scripts (at least one run locally)

**Step 1: Write expected behavior checks**

Switch smoke navigation/assertions from `/app/*` to `/`, `/admin/*`, `/viewer/*`.

**Step 2: Remove legacy smoke path**

- Remove `smoke:spa-legacy-fallback` script from `package.json`.
- Remove matrix entry from CI workflow.

**Step 3: Run smoke verification**

Run at least:
- `npm run build:frontend`
- `npm run smoke:spa-public`

Expected: PASS with root-based routes.

**Step 4: Commit**

```bash
git add scripts/smoke_spa_admin.js scripts/smoke_spa_admin_writepath.js scripts/smoke_spa_public.js package.json .github/workflows/docker-image.yml
git rm scripts/smoke_spa_legacy_fallback.js
git commit -m "test(smoke): align checks to root spa hard cutover"
```

### Task 5: Delete legacy frontend files and refresh docs

**Files:**
- Delete: `index.html`
- Delete: `viewer.html`
- Delete: `assets/app.js`
- Delete: `assets/api.js`
- Delete: `assets/viewer.js`
- Delete: `assets/styles.css`
- Modify: `tests/viewer-default-mode.test.js` (remove legacy-script assertion)
- Modify: `docs/guides/spa-and-frontend.md`
- Modify: `docs/guides/configuration.md`
- Modify: `README.md` (only if route wording needs correction)

**Step 1: Add/adjust failing tests first**

Replace legacy viewer script assertion with current SPA behavior assertion (or remove obsolete test if no longer meaningful).

**Step 2: Remove legacy artifacts and docs**

Delete old files and update docs to:
- Describe `/` + history fallback architecture.
- Remove `SPA_DEFAULT_ENTRY` and legacy fallback references.

**Step 3: Run targeted tests**

Run:
- `node --test tests/viewer-default-mode.test.js`
- `node --test tests/spa-entry-routes.test.js`

Expected: PASS.

**Step 4: Commit**

```bash
git add docs/guides/spa-and-frontend.md docs/guides/configuration.md tests/viewer-default-mode.test.js README.md
git rm index.html viewer.html assets/app.js assets/api.js assets/viewer.js assets/styles.css
git commit -m "chore(frontend): remove legacy frontend artifacts"
```

### Task 6: Full verification and residual-reference scan

**Files:**
- Modify: none (unless failures found)
- Test: full suite

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run test:frontend -- --run`
- `npm run build:frontend`
- `npm run smoke:spa-admin`
- `npm run smoke:spa-admin-write`
- `npm run smoke:spa-public`

Expected: all green.

**Step 2: Run residual legacy scan**

Run:
- `rg -n "viewer\\.html|/app\\b|SPA_DEFAULT_ENTRY|assets/app\\.js|smoke:spa-legacy-fallback" README.md docs scripts tests server frontend package.json .github -S`

Expected: no runtime/docs/CI references to legacy cutover behavior (historical plan docs may still contain archived references).

**Step 3: Final commit (if needed)**

```bash
git add -A
git commit -m "chore: finalize vue hard cutover verification fixes"
```
