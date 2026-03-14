# UI Interaction Bugfix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the homepage and login interaction regressions found in the 2026-03-06 UI audit, then harden the scripted UI audit so empty/error catalog states are treated as valid UI states instead of false failures.

**Architecture:** Keep the current route map and public/admin shell structure, but separate “catalog request failed” from “catalog loaded but empty”, persist catalog browsing context across viewer round-trips, and ensure homepage sections render distinct item sets instead of repeating the same slice three times. Prefer small, testable state helpers inside the existing catalog feature module, then extend the current smoke scripts instead of introducing a new e2e stack.

**Tech Stack:** Vue 3 Composition API, Vue Router, scoped CSS, Vitest, node:test, Playwright-based smoke/audit scripts.

---

### Task 1: Lock the audited regressions into tests

**Files:**
- Modify: `frontend/test/catalog-service.test.ts`
- Create: `frontend/test/catalog-view-state-persistence.test.ts`
- Create: `frontend/test/catalog-home-sections.test.ts`
- Modify: `frontend/test/login-flow-consistency.test.ts`
- Create: `tests/ui-audit-capture.test.js`

**Step 1: Write the failing catalog load test**

Extend `frontend/test/catalog-service.test.ts` so a failed `/api/catalog` request no longer expects a silent “empty groups” success shape. The regression target should prove the service surfaces failure metadata that the view layer can distinguish from a truly empty catalog.

**Step 2: Write the failing catalog state persistence tests**

Create `frontend/test/catalog-view-state-persistence.test.ts` around extracted pure helpers for reading and writing catalog view state. Assert that `groupId`, `categoryId`, and `query` round-trip through storage safely, and that malformed persisted data falls back cleanly.

**Step 3: Write the failing homepage section split tests**

Create `frontend/test/catalog-home-sections.test.ts` around a pure helper that derives homepage slices. Assert that “current category” and “recommended” never return overlapping item IDs, and that the recommendation block collapses when no distinct follow-up slice exists.

**Step 4: Write the failing login and audit-script regression tests**

Update `frontend/test/login-flow-consistency.test.ts` so the modal login flow is expected to use `resolveAdminRedirect(...)` instead of hard-coding `/admin/dashboard`. Create `tests/ui-audit-capture.test.js` to assert that `scripts/ui_audit_capture.js` supports both `--tag=foo` and `--tag foo`, and that its readiness gate recognizes catalog-ready, catalog-empty, and catalog-error shells.

**Step 5: Run the new tests to confirm they fail**

Run:
- `npm --prefix frontend run test -- --run catalog-service.test.ts catalog-view-state-persistence.test.ts catalog-home-sections.test.ts login-flow-consistency.test.ts`
- `node --test tests/ui-audit-capture.test.js`

Expected: failures around missing failure metadata, missing query persistence, overlapping homepage slices, hard-coded modal redirect, and the narrow audit-script argument/readiness assumptions.

### Task 2: Surface real catalog failures instead of pretending the catalog is empty

**Files:**
- Modify: `frontend/src/features/catalog/catalogService.ts`
- Modify: `frontend/src/features/catalog/useCatalogViewState.ts`
- Modify: `frontend/src/views/CatalogView.vue`
- Test: `frontend/test/catalog-service.test.ts`

**Step 1: Refactor catalog loading to return a typed result**

Change `loadCatalogData()` so it can represent both:
- successful load with normalized catalog data
- failed load with explicit failure metadata

Keep normalization behavior for legacy payload shapes, but stop collapsing transport/server failures into the same shape as a legitimate empty catalog.

**Step 2: Update the catalog composable to consume the typed result**

In `useCatalogViewState.ts`, set `loadError` only when the catalog request truly fails. Keep `libraryCatalog` loading isolated so a library-side failure does not erase a successful public catalog response.

**Step 3: Render a distinct request-failure state**

Update `CatalogView.vue` so request failure shows intentional copy such as “加载目录失败，请稍后重试”, while a successful but empty catalog keeps the empty-state wording. Do not render the large navigation sections when there are no groups to show.

**Step 4: Run the targeted tests**

Run:
- `npm --prefix frontend run test -- --run catalog-service.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/features/catalog/catalogService.ts frontend/src/features/catalog/useCatalogViewState.ts frontend/src/views/CatalogView.vue frontend/test/catalog-service.test.ts
git commit -m "fix(catalog): distinguish load failures from empty state"
```

### Task 3: Preserve catalog browsing context across viewer round-trips

**Files:**
- Modify: `frontend/src/features/catalog/useCatalogViewState.ts`
- Modify: `scripts/smoke_spa_public.js`
- Test: `frontend/test/catalog-view-state-persistence.test.ts`

**Step 1: Extend persisted catalog state to include search query**

Add `query` to the catalog view-state payload, and keep the parsing logic defensive so stale storage values do not break startup.

**Step 2: Restore and persist the query at the correct times**

Restore `query` before the initial catalog computation on mount. Persist it whenever the user changes search, group, or category, so both full-page reloads and viewer returns land back in the previous browsing context.

**Step 3: Extend the public smoke flow with the audited regression**

In `scripts/smoke_spa_public.js`, add the exact path that failed during audit:
- fill search input
- open a matching viewer card
- return to catalog
- assert the search input still contains the previous query

**Step 4: Run the targeted checks**

Run:
- `npm --prefix frontend run test -- --run catalog-view-state-persistence.test.ts`
- `SMOKE_ADMIN_USERNAME=admin SMOKE_ADMIN_PASSWORD=admin JWT_SECRET=test-secret npm run smoke:spa-public`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/features/catalog/useCatalogViewState.ts frontend/test/catalog-view-state-persistence.test.ts scripts/smoke_spa_public.js
git commit -m "fix(catalog): preserve search context across viewer navigation"
```

### Task 4: Split homepage content slices so sections stop repeating the same cards

**Files:**
- Modify: `frontend/src/features/catalog/useCatalogViewState.ts`
- Modify: `frontend/src/views/CatalogView.vue`
- Test: `frontend/test/catalog-home-sections.test.ts`

**Step 1: Extract a pure homepage-slice helper**

Create a small helper inside the catalog feature that derives:
- `currentItems`
- `recommendedItems`

Use non-overlapping slices from the filtered item list, and prefer returning an empty recommendation slice rather than duplicating the current slice.

**Step 2: Rewire the catalog view to consume the split slices**

Render “当前分类” from `currentItems` and “推荐演示” from `recommendedItems`. If `recommendedItems` is empty, hide the recommendation block entirely instead of rendering a second copy of the same cards.

**Step 3: Keep the full catalog stream unchanged**

Do not rewrite the “全部内容” block in this task; it should remain the complete stream, while only the curated upper sections become distinct.

**Step 4: Run the targeted tests**

Run:
- `npm --prefix frontend run test -- --run catalog-home-sections.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/features/catalog/useCatalogViewState.ts frontend/src/views/CatalogView.vue frontend/test/catalog-home-sections.test.ts
git commit -m "fix(catalog): remove duplicate homepage recommendation slices"
```

### Task 5: Unify modal and page login redirect behavior

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/test/login-flow-consistency.test.ts`

**Step 1: Reuse the same redirect sanitizer in the modal flow**

Import and use `resolveAdminRedirect(route.query.redirect)` in `App.vue` so modal login and `/login` page login share the same redirect contract.

**Step 2: Keep the current default destination**

When there is no valid redirect query, preserve the current default of landing on `/admin/dashboard`.

**Step 3: Run the targeted tests and admin smoke**

Run:
- `npm --prefix frontend run test -- --run login-flow-consistency.test.ts`
- `SMOKE_ADMIN_USERNAME=admin SMOKE_ADMIN_PASSWORD=admin JWT_SECRET=test-secret npm run smoke:spa-admin`

Expected: PASS

**Step 4: Commit**

```bash
git add frontend/src/App.vue frontend/test/login-flow-consistency.test.ts
git commit -m "fix(auth): align modal login redirects with login page"
```

### Task 6: Harden UI audit automation against valid empty/error states

**Files:**
- Modify: `scripts/ui_audit_capture.js`
- Test: `tests/ui-audit-capture.test.js`
- Output: `output/playwright/ui-audit/after-desktop-catalog.png`
- Output: `output/playwright/ui-audit/after-mobile-catalog.png`

**Step 1: Relax the tag parser**

Allow `parseTagArg()` to accept both supported shell styles:
- `--tag=after`
- `--tag after`

**Step 2: Broaden the public-page readiness gate**

Change the initial wait in `captureViewportSuite()` so the capture proceeds when any one of these is visible:
- the catalog search input / main shell
- the intentional empty state
- the intentional error state

Do not require the named “大类” navigation to have visible content in order to capture a valid empty catalog.

**Step 3: Keep failure semantics strict where they matter**

Continue failing the audit on console errors, page errors, or missing login/admin shells. Only remove the false-positive failure caused by a zero-item catalog.

**Step 4: Run the script tests and capture once**

Run:
- `node --test tests/ui-audit-capture.test.js`
- `npm run build:frontend`
- `SMOKE_ADMIN_USERNAME=admin SMOKE_ADMIN_PASSWORD=admin JWT_SECRET=test-secret node scripts/ui_audit_capture.js --tag=after --viewport-only`

Expected: PASS and fresh `after-*` screenshots in `output/playwright/ui-audit/`.

**Step 5: Commit**

```bash
git add scripts/ui_audit_capture.js tests/ui-audit-capture.test.js output/playwright/ui-audit
git commit -m "test(ui): make audit capture resilient to empty catalog states"
```

### Task 7: Run final verification and update the frontend workflow docs if needed

**Files:**
- Modify: `docs/guides/spa-and-frontend.md`

**Step 1: Update docs only if behavior or commands changed materially**

If the public search-context guarantee or `ui_audit_capture.js` invocation semantics changed in a user-facing way, add a short note to `docs/guides/spa-and-frontend.md`. Skip this step if the code changes remain fully internal.

**Step 2: Run the full relevant verification set**

Run:
- `npm --prefix frontend run test -- --run`
- `node --test tests/ui-audit-capture.test.js`
- `npm run build:frontend`
- `SMOKE_ADMIN_USERNAME=admin SMOKE_ADMIN_PASSWORD=admin JWT_SECRET=test-secret npm run smoke:spa-public`
- `SMOKE_ADMIN_USERNAME=admin SMOKE_ADMIN_PASSWORD=admin JWT_SECRET=test-secret npm run smoke:spa-admin`
- `SMOKE_ADMIN_USERNAME=admin SMOKE_ADMIN_PASSWORD=admin JWT_SECRET=test-secret npm run smoke:spa-library-admin`
- `SMOKE_ADMIN_USERNAME=admin SMOKE_ADMIN_PASSWORD=admin JWT_SECRET=test-secret node scripts/ui_audit_capture.js --tag=after`

Expected: PASS

**Step 3: Final commit**

```bash
git add frontend docs scripts tests output/playwright/ui-audit
git commit -m "fix(ui): resolve audited homepage and interaction regressions"
```

### Task 8: Remove dead hero anchors when curated sections disappear

**Files:**
- Modify: `frontend/src/features/catalog/useCatalogViewState.ts`
- Modify: `frontend/src/views/CatalogView.vue`
- Test: `frontend/test/catalog-hero-actions.test.ts`

**Step 1: Add a pure hero-action target helper**

Derive stable hero CTA targets from the actual section availability so the homepage never links to a missing anchor.

**Step 2: Route empty/search-no-match states to the main grid**

When `#catalog-current` and `#catalog-library` are absent, point the hero actions to the main catalog grid instead of leaving dead in-page anchors.

**Step 3: Run targeted verification**

Run:
- `npm --prefix frontend run test -- --run catalog-hero-actions.test.ts`

Expected: PASS

### Task 9: Make viewer and library returns respect SPA history

**Files:**
- Create: `frontend/src/features/navigation/backNavigation.ts`
- Modify: `frontend/src/views/ViewerView.vue`
- Modify: `frontend/src/views/LibraryFolderView.vue`
- Test: `frontend/test/return-navigation.test.ts`

**Step 1: Add a small shared back-navigation helper**

Detect whether Vue Router history has a real back entry before deciding between `router.back()` and fallback home navigation.

**Step 2: Replace hard-coded home links in return controls**

Use button-driven return actions so viewer/library pages go back in history when entered from the catalog, but still fall back to `/` on direct entry.

**Step 3: Run targeted verification**

Run:
- `npm --prefix frontend run test -- --run return-navigation.test.ts`
- manual or scripted browser repro for `catalog -> viewer -> back -> browser back`

Expected: PASS

### Task 10: Add dismissal affordances for the admin mobile menu

**Files:**
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`
- Test: `frontend/test/admin-mobile-menu-dismissal.test.ts`

**Step 1: Add keyboard dismissal**

Close the mobile workspace menu on `Escape` so keyboard users are not trapped in the open state.

**Step 2: Add backdrop dismissal**

Render a lightweight backdrop that closes the mobile menu on outside click/tap.

**Step 3: Run targeted verification**

Run:
- `npm --prefix frontend run test -- --run admin-mobile-menu-dismissal.test.ts`
- manual or scripted mobile repro for opening the admin menu and pressing `Escape`

Expected: PASS
