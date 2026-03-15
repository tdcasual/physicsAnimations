# Next-Phase Product UI Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the current Teaching Atlas UI convergence, reduce frontend complexity in the highest-churn surfaces, and prepare the product for teacher-facing workflow features instead of more one-off visual additions.

**Architecture:** Reuse the current Vue SPA, shared token system, and route structure. Prioritize closing the active UI refinement lane first, then extract oversized public/admin/viewer surfaces into reusable page-level components, then design and implement teacher workflow primitives on top of a calmer and more maintainable shell.

**Tech Stack:** Vue 3, Vue Router, scoped CSS, shared CSS tokens, Vitest, Vite, existing smoke and screenshot audit scripts

---

## Priority Overview

- `P0`: Close current visual hierarchy work and remove complexity hotspots
- `P1`: Turn the site from a discovery atlas into a repeat-use teaching workspace
- `P2`: Add evidence loops and content enrichment only after the UI shell is stable

### Task 1 (P0): Close the current public/admin/viewer refinement round

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/AppShell.css`
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/CatalogView.css`
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`
- Modify: `frontend/src/views/admin/AdminLibraryView.vue`
- Modify: `frontend/src/views/admin/library/AdminLibraryView.template.html`
- Modify: `frontend/src/views/admin/library/AdminLibraryView.css`
- Modify: `frontend/src/views/ViewerView.vue`
- Test: `frontend/test/app-shell-visual-polish.test.ts`
- Test: `frontend/test/app-shell-copy.test.ts`
- Test: `frontend/test/topbar-responsive.test.ts`
- Test: `frontend/test/catalog-navigation-layout.test.ts`
- Test: `frontend/test/catalog-visual-polish.test.ts`
- Test: `frontend/test/admin-shell-structure.test.ts`
- Test: `frontend/test/admin-visual-polish.test.ts`
- Test: `frontend/test/admin-style-semantics.test.ts`
- Test: `frontend/test/library-admin-layout.test.ts`
- Test: `frontend/test/viewer-actionbar.test.ts`
- Test: `frontend/test/viewer-screenshot-layout.test.ts`
- Test: `frontend/test/viewer-sticky-offset.test.ts`

**Step 1: Reconcile active UI plans before touching code**

Read and merge the intent from:
- `docs/plans/2026-03-14-teaching-atlas-next-design-actions-plan.md`
- `docs/plans/2026-03-14-catalog-hero-compression-plan.md`
- `docs/plans/2026-03-14-quick-access-and-admin-header-tightening-plan.md`
- `docs/plans/2026-03-14-admin-library-unification-plan.md`

Expected outcome:
- one combined implementation pass
- no duplicate rework across shell, catalog, admin, and viewer

**Step 2: Write or tighten failing source-structure tests**

Add assertions for:
- a quieter and clearer shell control hierarchy
- a lighter catalog hero and denser quick-access band
- an operational admin shell with less repeated explanation
- shared admin page semantics in the library view
- a viewer that reads as a presentation stage, not a generic preview wrapper

**Step 3: Run targeted tests to verify they fail where needed**

Run:

```bash
npm --prefix frontend run test -- test/app-shell-visual-polish.test.ts test/app-shell-copy.test.ts test/topbar-responsive.test.ts test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts test/admin-style-semantics.test.ts test/library-admin-layout.test.ts test/viewer-actionbar.test.ts test/viewer-screenshot-layout.test.ts test/viewer-sticky-offset.test.ts
```

Expected: at least one targeted failure if new hooks or copy changes are required.

**Step 4: Implement the minimal convergence pass**

Implementation goals:
- public pages stay invitational and atlas-like
- viewer becomes the most visually dominant route
- admin reads denser and more operational than public pages
- library admin uses the same page-level language as other admin routes
- no route or behavior changes beyond presentation and hierarchy tightening

**Step 5: Run targeted tests and safety checks**

Run:

```bash
npm --prefix frontend run test -- test/app-shell-visual-polish.test.ts test/app-shell-copy.test.ts test/topbar-responsive.test.ts test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts test/admin-style-semantics.test.ts test/library-admin-layout.test.ts test/viewer-actionbar.test.ts test/viewer-screenshot-layout.test.ts test/viewer-sticky-offset.test.ts
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Expected: all commands exit `0`.

**Step 6: Capture visual evidence**

Run:

```bash
SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/ui_audit_capture.js --tag next-phase-ui-pass --viewport-only
SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/smoke_spa_public.js
```

Expected:
- fresh public, admin, and viewer screenshots
- no obvious hierarchy regressions on desktop or mobile

### Task 2 (P0): Extract the biggest view hotspots before more polish work

**Files:**
- Create: `frontend/src/components/catalog/CatalogHeroSection.vue`
- Create: `frontend/src/components/catalog/CatalogQuickAccessBand.vue`
- Create: `frontend/src/components/viewer/ViewerStageShell.vue`
- Create: `frontend/src/components/admin/AdminShellHeader.vue`
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/CatalogView.css`
- Modify: `frontend/src/views/ViewerView.vue`
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`
- Test: `frontend/test/catalog-navigation-layout.test.ts`
- Test: `frontend/test/catalog-visual-polish.test.ts`
- Test: `frontend/test/viewer-actionbar.test.ts`
- Test: `frontend/test/admin-shell-structure.test.ts`

**Step 1: Lock composition boundaries in tests**

Add assertions that the oversized route views delegate page-level sections to dedicated components rather than keeping all structure inline.

**Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix frontend run test -- test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/viewer-actionbar.test.ts test/admin-shell-structure.test.ts
```

Expected: FAIL because the current structure is still route-heavy.

**Step 3: Extract minimal page-level components**

Implementation goals:
- keep business state in existing composables
- extract only presentation-heavy sections
- avoid inventing a deep component tree
- reduce change surface in `CatalogView.vue` and `ViewerView.vue`

**Step 4: Re-run tests and file-budget checks**

Run:

```bash
npm --prefix frontend run test -- test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/viewer-actionbar.test.ts test/admin-shell-structure.test.ts
npm run guard:file-size
```

Expected:
- all targeted tests pass
- the largest public/viewer files move away from the budget edge

**Step 5: Commit**

```bash
git add frontend/src/components/catalog/CatalogHeroSection.vue frontend/src/components/catalog/CatalogQuickAccessBand.vue frontend/src/components/viewer/ViewerStageShell.vue frontend/src/components/admin/AdminShellHeader.vue frontend/src/views/CatalogView.vue frontend/src/views/CatalogView.css frontend/src/views/ViewerView.vue frontend/src/views/admin/AdminLayoutView.vue
git commit -m "refactor: extract shared product ui sections"
```

### Task 3 (P1): Design the first repeat-use teacher workflow

**Files:**
- Create: `docs/plans/2026-03-14-teacher-workflow-design.md`
- Review: `frontend/src/features/catalog/useCatalogViewState.ts`
- Review: `frontend/src/features/navigation/backNavigation.ts`
- Review: `frontend/src/features/viewer/viewerService.ts`
- Review: `frontend/src/views/CatalogView.vue`
- Review: `frontend/src/views/ViewerView.vue`
- Review: `frontend/src/views/LibraryFolderView.vue`

**Step 1: Write the workflow design before implementation**

Design one concrete repeat-use workflow, recommended priority:
- `recently viewed`
- `favorite demos`
- `lesson queue` for temporary classroom ordering

Recommendation:
- start with `recently viewed + favorite demos`
- defer `lesson queue` until the first two are validated

**Step 2: Document the product contract**

The design doc must cover:
- target user and classroom moment
- entry points in catalog, viewer, and library
- empty states
- mobile behavior
- persistence strategy
- success metrics

**Step 3: Validate the scope**

Rule:
- do not implement all three workflows at once
- keep the first workflow shippable in under one week

**Step 4: Save and review**

Expected output:
- a small design doc that can drive a separate implementation plan

### Task 4 (P1): Implement one teaching workflow with minimal state and visible value

**Files:**
- Modify: `frontend/src/features/catalog/useCatalogViewState.ts`
- Modify: `frontend/src/features/navigation/backNavigation.ts`
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/ViewerView.vue`
- Modify: `frontend/src/views/LibraryFolderView.vue`
- Create: `frontend/src/features/catalog/recentActivity.ts`
- Create: `frontend/src/features/catalog/favorites.ts`
- Test: `frontend/test/catalog-view-state-persistence.test.ts`
- Test: `frontend/test/return-navigation.test.ts`
- Test: `frontend/test/catalog-home-sections.test.ts`
- Test: `frontend/test/viewer-actionbar.test.ts`
- Test: `frontend/test/library-folder-view.test.ts`

**Step 1: Write failing tests for the chosen workflow**

Recommended first slice:
- viewer visit writes recent activity
- catalog can render a small recent/favorite section
- favorite action is available from viewer and at least one listing surface

**Step 2: Run the targeted tests to confirm failure**

Run:

```bash
npm --prefix frontend run test -- test/catalog-view-state-persistence.test.ts test/return-navigation.test.ts test/catalog-home-sections.test.ts test/viewer-actionbar.test.ts test/library-folder-view.test.ts
```

Expected: FAIL because no recent/favorite workflow exists yet.

**Step 3: Implement the smallest useful version**

Implementation goals:
- local-first persistence
- no server dependency
- no modal-heavy interaction
- public pages remain browse-first, not dashboard-heavy

**Step 4: Re-run tests and product checks**

Run:

```bash
npm --prefix frontend run test -- test/catalog-view-state-persistence.test.ts test/return-navigation.test.ts test/catalog-home-sections.test.ts test/viewer-actionbar.test.ts test/library-folder-view.test.ts
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Expected: all commands exit `0`.

### Task 5 (P2): Add a release-grade visual regression bundle

**Files:**
- Modify: `scripts/ui_audit_capture.js`
- Modify: `scripts/qa_release_gate.sh`
- Modify: `docs/guides/ops-release-runbook.md`
- Modify: `docs/guides/continuous-improvement-roadmap.md`

**Step 1: Define the minimum screenshot set**

Include:
- desktop catalog
- mobile catalog
- desktop viewer
- desktop admin dashboard
- mobile admin dashboard
- desktop admin library

**Step 2: Make the release gate call the screenshot audit in a controlled mode**

Requirement:
- keep it optional locally if runtime credentials are unavailable
- keep it mandatory in release review or CI when credentials are present

**Step 3: Document how to read failures**

Update the runbook with:
- expected output paths
- what counts as a blocking regression
- when to refresh baselines

**Step 4: Verify**

Run:

```bash
npm run qa:release
```

Expected:
- existing gates still pass
- screenshot evidence becomes part of the standard release checklist

## Delivery Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5

## Guardrails

- Do not start new homepage sections before Task 2 lands.
- Do not add server-backed personalization before the local-first workflow is validated.
- Do not expand visual scope again until screenshot-based review is part of the release routine.

