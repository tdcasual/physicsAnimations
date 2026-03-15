# Next-Phase Teacher Workspace And Maintainability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the current catalog and admin shell into a more durable teacher workspace by removing brittle test coupling, extracting repeated admin logic, and shipping the next wave of repeat-use classroom workflow improvements.

**Architecture:** Keep the existing Vue SPA, route map, and local-first teacher workflow model. Prioritize maintainability and test resilience first, then build the next teacher-facing workflow pass on top of stable catalog, viewer, and library surfaces instead of layering more behavior into oversized route files.

**Tech Stack:** Vue 3, Vue Router, composables, scoped CSS, Vitest, Vite, TypeScript, existing local-first catalog persistence helpers

---

## Priority Overview

- `P0`: Remove refactor friction caused by source-string tests and repeated admin state logic
- `P1`: Extend the teacher quick-access workflow into a clearer repeat-use workspace
- `P2`: Clean up CI noise and add lighter evidence loops after the product shell is stable

### Task 1 (P0): Replace brittle source-string assertions with behavior-driven tests

**Files:**
- Modify: `frontend/test/catalog-home-sections.test.ts`
- Modify: `frontend/test/catalog-mobile-filter-focus.test.ts`
- Modify: `frontend/test/catalog-return-scroll.test.ts`
- Modify: `frontend/test/catalog-hash-scroll.test.ts`
- Modify: `frontend/test/public-document-title.test.ts`
- Modify: `frontend/test/admin-system-step-navigation-guard.test.ts`
- Modify: `frontend/test/admin-system-busy-navigation-lock.test.ts`
- Modify: `frontend/test/admin-system-feedback-hints.test.ts`
- Modify: `frontend/test/admin-system-embed-updater.test.ts`
- Review: `frontend/src/views/CatalogView.vue`
- Review: `frontend/src/views/useCatalogViewChrome.ts`
- Review: `frontend/src/views/useCatalogMobileFilterFocus.ts`
- Review: `frontend/src/features/admin/system/useSystemWizard.ts`
- Review: `frontend/src/features/admin/system/useSystemWizardActions.ts`

**Step 1: Audit string-based tests and classify them by behavior**

Create a quick checklist covering:
- structure-only assertions that should become render tests
- composable wiring assertions that should become helper tests
- title/hash/scroll assertions that should become state-transition tests

Expected outcome:
- one mapping from each string assertion to a real interaction or state effect

**Step 2: Write failing behavior tests for catalog routing and focus flows**

Add or extend tests so they verify:
- recent and favorites sections render when fed teacher quick-access data
- mobile filter opening triggers focus behavior through `createCatalogMobileFilterFocus`
- return-scroll restoration uses the extracted helper contract rather than source inspection
- catalog hash recovery replays anchor behavior after async load completion
- document title updates reflect loading, error, and resolved hero title states

**Step 3: Run catalog-focused tests to verify red state**

Run:

```bash
npm --prefix frontend run test -- test/catalog-home-sections.test.ts test/catalog-mobile-filter-focus.test.ts test/catalog-return-scroll.test.ts test/catalog-hash-scroll.test.ts test/public-document-title.test.ts
```

Expected: at least one failure caused by new behavior expectations.

**Step 4: Remove compatibility-only source hooks from route files**

Implementation goals:
- delete compatibility token arrays added only for source-based tests
- keep extracted logic in `useCatalogViewChrome.ts`
- keep `CatalogView.vue` under the existing size budget

**Step 5: Convert system wizard tests away from source-shape matching where practical**

Prefer:
- helper/composable contract tests for navigation guard rules
- panel-level rendering checks for disable-hint presentation
- action tests for embed updater persistence

Keep only file-budget checks as source-based assertions.

**Step 6: Run targeted tests and safety checks**

Run:

```bash
npm --prefix frontend run test -- test/catalog-home-sections.test.ts test/catalog-mobile-filter-focus.test.ts test/catalog-return-scroll.test.ts test/catalog-hash-scroll.test.ts test/public-document-title.test.ts test/admin-system-step-navigation-guard.test.ts test/admin-system-busy-navigation-lock.test.ts test/admin-system-feedback-hints.test.ts test/admin-system-embed-updater.test.ts test/system-wizard-state-size.test.ts
npm --prefix frontend run typecheck
```

Expected: all commands exit `0` and `CatalogView.vue` no longer needs source-hook shims.

### Task 2 (P0): Extract shared admin item editor helpers from content and uploads

**Files:**
- Create: `frontend/src/features/admin/composables/useAdminItemEditorState.ts`
- Create: `frontend/src/features/admin/composables/useAdminQueryReload.ts`
- Modify: `frontend/src/features/admin/content/useContentAdmin.ts`
- Modify: `frontend/src/features/admin/content/useContentAdminActions.ts`
- Modify: `frontend/src/features/admin/uploads/useUploadAdmin.ts`
- Modify: `frontend/src/features/admin/uploads/useUploadAdminActions.ts`
- Test: `frontend/test/content-admin-state-size.test.ts`
- Test: `frontend/test/upload-admin-state-size.test.ts`
- Test: `frontend/test/admin-draft-preservation.test.ts`
- Test: `frontend/test/admin-pending-changes-route-guard.test.ts`
- Test: `frontend/test/ui-interaction-guardrails.test.ts`
- Test: `frontend/test/admin-preview-default-open.test.ts`

**Step 1: Write helper-level tests for shared editor state behavior**

Cover:
- current item fallback to `editingSnapshot`
- pending edit detection from saved snapshot versus draft snapshot
- confirm-before-switch flow for dirty drafts
- query debounce cleanup on unmount

If there is no existing helper test location, add focused tests near current admin composable tests.

**Step 2: Run the new helper tests to verify they fail**

Run the smallest possible targeted test command for the new helper tests.

Expected: fail because the shared composables do not exist yet.

**Step 3: Extract minimal shared helpers**

Implementation goals:
- keep content-specific link creation in `useContentAdmin.ts`
- keep upload risk-confirm flow in `useUploadAdmin.ts`
- move only repeated draft/edit/query orchestration into shared composables
- avoid a generic abstraction for unrelated resource creation behavior

**Step 4: Re-wire content and uploads through the new helpers**

Preserve:
- `previewHref()` ownership in each feature composable
- inline field error APIs already consumed by the pages
- stale-request protection in action modules
- page-specific success/error copy

**Step 5: Run targeted verification**

Run:

```bash
npm --prefix frontend run test -- test/content-admin-state-size.test.ts test/upload-admin-state-size.test.ts test/admin-draft-preservation.test.ts test/admin-pending-changes-route-guard.test.ts test/ui-interaction-guardrails.test.ts test/admin-preview-default-open.test.ts test/admin-inline-feedback.test.ts
```

Expected: all pass and both feature composables stay comfortably below the current budgets.

### Task 3 (P1): Design and lock the teacher quick-access phase 2 contract

**Files:**
- Create: `docs/plans/2026-03-15-teacher-workspace-phase2-design.md`
- Review: `docs/plans/2026-03-14-teacher-workflow-design.md`
- Review: `frontend/src/features/catalog/recentActivity.ts`
- Review: `frontend/src/features/catalog/favorites.ts`
- Review: `frontend/src/features/catalog/useCatalogViewState.ts`
- Review: `frontend/src/views/CatalogView.vue`
- Review: `frontend/src/views/ViewerView.vue`
- Review: `frontend/src/views/LibraryFolderView.vue`

**Step 1: Reconcile the current teacher workflow scope**

Document what already exists:
- recent activity
- favorites
- teacher quick-access area
- back-navigation fallback hashes

Explicitly list what is still missing:
- predictable ordering and pruning rules visible to teachers
- stronger empty-state guidance for repeat classroom use
- a clearer bridge between library folders and teacher quick access
- a decision on whether cross-device sync remains deferred

**Step 2: Evaluate 2-3 product directions and choose one**

Recommended options:
- improve local-first quick access only
- add a lightweight lesson set or pinning model
- prepare a future sync contract without shipping server persistence yet

Recommendation:
- ship a stronger local-first phase 2 now, while documenting sync as a future contract

**Step 3: Write the design doc**

The doc must cover:
- user moments before class, during class, and during review
- updated catalog, viewer, and library entry points
- mobile behavior and empty states
- persistence lifecycle and pruning rules
- success metrics and explicit non-goals

**Step 4: Save and review before implementation**

Expected output:
- a short design doc that can feed the next implementation slice without re-discovery work

### Task 4 (P1): Implement teacher workspace phase 2 on catalog, viewer, and library surfaces

**Files:**
- Modify: `frontend/src/features/catalog/recentActivity.ts`
- Modify: `frontend/src/features/catalog/favorites.ts`
- Modify: `frontend/src/features/catalog/useCatalogViewState.ts`
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/CatalogView.css`
- Modify: `frontend/src/views/ViewerView.vue`
- Modify: `frontend/src/views/LibraryFolderView.vue`
- Create: `frontend/src/components/catalog/CatalogTeacherWorkspaceSummary.vue`
- Create: `frontend/src/components/catalog/CatalogTeacherWorkspaceEmptyState.vue`
- Test: `frontend/test/catalog-home-sections.test.ts`
- Test: `frontend/test/catalog-visual-polish.test.ts`
- Test: `frontend/test/catalog-navigation-layout.test.ts`
- Test: `frontend/test/library-folder-view.test.ts`
- Test: `frontend/test/catalog-view-state-persistence.test.ts`
- Test: `frontend/test/return-navigation.test.ts`

**Step 1: Write failing tests for the chosen phase 2 workflow contract**

Cover:
- teacher quick-access sections preserve a stable ranking and prune stale items
- empty states teach the next useful action instead of acting as placeholders
- library folders expose clearer return-to-workspace affordances
- viewer favorite actions preserve repeat-use context when returning to catalog

**Step 2: Run focused tests to verify red state**

Run:

```bash
npm --prefix frontend run test -- test/catalog-home-sections.test.ts test/catalog-visual-polish.test.ts test/catalog-navigation-layout.test.ts test/library-folder-view.test.ts test/catalog-view-state-persistence.test.ts test/return-navigation.test.ts
```

Expected: failures reflect the new teacher workspace behaviors.

**Step 3: Implement the minimal product pass**

Implementation goals:
- keep workflow local-first
- do not add a new route or dashboard
- improve speed to reopen demos from the homepage
- keep library supportive rather than making it another management surface

**Step 4: Run targeted tests and route-level safety checks**

Run:

```bash
npm --prefix frontend run test -- test/catalog-home-sections.test.ts test/catalog-visual-polish.test.ts test/catalog-navigation-layout.test.ts test/library-folder-view.test.ts test/catalog-view-state-persistence.test.ts test/return-navigation.test.ts test/catalog-mobile-filter-focus.test.ts test/catalog-return-scroll.test.ts
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Expected: all commands exit `0` with no new size-budget regressions.

### Task 5 (P2): Clean up frontend verification noise and add lightweight evidence loops

**Files:**
- Modify: `frontend/test/router-scroll-behavior.test.ts`
- Modify: `frontend/test/catalog-return-scroll.test.ts`
- Modify: `frontend/test/setup` or existing Vitest bootstrap file if present
- Review: `scripts/ui_audit_capture.js`
- Review: `scripts/smoke_spa_public.js`
- Review: `scripts/` capture helpers already used for UI evidence

**Step 1: Isolate current noisy test output**

Capture the warnings currently seen during full test runs:
- `Not implemented: Window's scrollTo() method`
- Vue Router hash-target warning for missing `#batch`

**Step 2: Write failing tests or harness assertions for cleaner mocks where needed**

Prefer:
- a shared `window.scrollTo` stub in test bootstrap
- explicit router-scroll expectations in the scroll behavior tests
- no silencing of unrelated warnings

**Step 3: Implement the smallest cleanup**

Goals:
- keep warnings meaningful
- reduce noise without muting real regressions
- make full-suite output easier to scan in future refactor passes

**Step 4: Re-run the full frontend verification stack**

Run:

```bash
npm --prefix frontend run test
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Expected: all pass and routine output becomes quieter.

**Step 5: Capture fresh evidence after the product shell stabilizes**

Run:

```bash
SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/ui_audit_capture.js --tag teacher-workspace-phase2 --viewport-only
SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/smoke_spa_public.js
```

Expected:
- updated catalog, library, viewer, and admin screenshots
- a stable baseline for the next product iteration

---

## Recommended Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5

## Exit Criteria

- no compatibility-only source hooks remain in `CatalogView.vue`
- current admin content/upload/system/taxonomy composables remain under budget after follow-up work
- teacher quick access feels like a repeat-use workspace rather than a one-time browse layer
- full frontend verification stays green
