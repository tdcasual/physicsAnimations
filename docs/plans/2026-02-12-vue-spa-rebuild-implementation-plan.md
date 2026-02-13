# Vue SPA Rebuild Phase A Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bootstrap a Vue 3 + Vite + TypeScript frontend and wire a safe `/app` SPA entry into the existing Express server without changing existing data/storage behavior.

**Architecture:** Keep the current backend/data model intact, add a new isolated frontend source tree under `frontend/`, and expose a dedicated `/app` route that serves built SPA files from `frontend/dist`. Existing `/`, `/index.html`, `/viewer.html`, and API routes remain unchanged.

**Tech Stack:** Node.js, Express, Vue 3, Vue Router 4, Pinia, Vite 7, TypeScript, Vitest, node:test.

---

### Task 1: Add failing server-route tests for SPA mounting

**Files:**
- Create: `tests/spa-entry-routes.test.js`
- Modify: none
- Test: `tests/spa-entry-routes.test.js`

**Step 1: Write the failing test**

Add tests that expect:
- `GET /app` returns `frontend/dist/index.html` when present.
- `GET /app/viewer/abc` also returns the same SPA index fallback.
- `GET /app/assets/app.js` serves static assets from `frontend/dist/assets`.

**Step 2: Run test to verify it fails**

Run: `node --test tests/spa-entry-routes.test.js`  
Expected: FAIL because `/app` routes are not mounted.

**Step 3: Write minimal implementation**

Modify `server/app.js` to:
- Mount static files from `frontend/dist/assets` on `/app/assets`.
- Serve `frontend/dist/index.html` for `/app` and `/app/*` when the file exists.
- Return `404 not_found` if SPA dist is missing.

**Step 4: Run test to verify it passes**

Run: `node --test tests/spa-entry-routes.test.js`  
Expected: PASS.

### Task 2: Add failing frontend route-shape test

**Files:**
- Create: `frontend/src/router/routes.ts`
- Create: `frontend/test/routes.test.ts`
- Modify: none
- Test: `frontend/test/routes.test.ts`

**Step 1: Write the failing test**

Create a Vitest test that expects route records for:
- `/`
- `/viewer/:id`
- `/login`
- `/admin` (with child routes)

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --run frontend/test/routes.test.ts`  
Expected: FAIL because frontend project/router does not exist.

**Step 3: Write minimal implementation**

Create minimal Vue app scaffold:
- `frontend/package.json`
- Vite + TS config files
- `frontend/src/main.ts`
- `frontend/src/App.vue`
- `frontend/src/router/index.ts`
- `frontend/src/router/routes.ts`
- placeholder views for required routes
- Pinia bootstrap

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --run frontend/test/routes.test.ts`  
Expected: PASS.

### Task 3: Wire repository scripts and build verification

**Files:**
- Modify: `package.json`
- Modify: `README.md` (frontend section)
- Test: script commands in package root

**Step 1: Write verification-first command list**

Define command contract:
- `npm run dev:frontend`
- `npm run build:frontend`
- `npm run test:frontend`

**Step 2: Implement scripts**

Add scripts in root `package.json` that delegate to `frontend` workspace via `npm --prefix frontend ...`.

**Step 3: Run verification commands**

Run:
- `npm run test:frontend -- --run frontend/test/routes.test.ts`
- `npm run build:frontend`

Expected: both PASS.

### Task 4: Full regression verification

**Files:**
- Modify: none
- Test: existing backend suite + new tests

**Step 1: Run targeted tests**

Run:
- `node --test tests/spa-entry-routes.test.js`
- `npm run test:frontend -- --run frontend/test/routes.test.ts`

**Step 2: Run full backend tests**

Run: `npm test`  
Expected: PASS with no newly introduced failures.

**Step 3: Summarize evidence**

Record exact command outcomes and changed files before claiming completion.
