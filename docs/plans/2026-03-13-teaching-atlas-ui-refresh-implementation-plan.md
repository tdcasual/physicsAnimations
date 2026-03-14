# Teaching Atlas UI Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh the public shell, catalog homepage, admin workspace, and viewer chrome into a more distinctive "teaching experiment atlas" visual system without changing routing or core workflows.

**Architecture:** Keep the existing Vue SPA structure and state flow, but introduce a stronger design system through shared tokens in `frontend/src/styles.css`, richer section composition in `CatalogView.vue`, and more contextual workspace framing in admin/viewer shells. Validate the redesign with small source-level tests plus build and screenshot-based smoke checks.

**Tech Stack:** Vue 3, Vue Router, Vite, scoped CSS, Vitest, Playwright smoke scripts

---

### Task 1: Lock the redesign with small failing tests

**Files:**
- Modify: `frontend/test/app-shell-visual-polish.test.ts`
- Modify: `frontend/test/catalog-visual-polish.test.ts`
- Modify: `frontend/test/admin-visual-polish.test.ts`

**Step 1: Write the failing test**

Add assertions for the new art-direction hooks:
- app shell exposes editorial/tinted token names and a new topbar meta layout
- catalog homepage includes a navigation ledger / map area and differentiated card treatments
- admin workspace includes a task-oriented overview shell instead of only generic stat cards

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- frontend/test/app-shell-visual-polish.test.ts frontend/test/catalog-visual-polish.test.ts frontend/test/admin-visual-polish.test.ts`

Expected: FAIL because the new selectors / copy / structure do not exist yet.

**Step 3: Write minimal implementation**

Only after the failures are confirmed, implement the new structure and styles in later tasks.

**Step 4: Re-run test to verify it passes**

Run the same command and expect all three tests to pass.

### Task 2: Rebuild the shared visual system

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/AppShell.css`

**Step 1: Introduce the new token system**

Add warm-paper backgrounds, ink-toned text, cobalt/copper accents, fluid type sizing, and stronger shadow/border elevation tokens while preserving dark mode and classroom mode hooks.

**Step 2: Reframe the topbar**

Adjust the app shell markup to support:
- stronger brand block
- compact subject/status meta copy
- clearer split between primary actions and utility actions

**Step 3: Preserve responsive behavior**

Keep safe areas, scrollable action rows, and modal behavior intact while adapting spacing and hierarchy for small screens.

### Task 3: Turn the catalog homepage into a teaching atlas

**Files:**
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/CatalogView.css`

**Step 1: Upgrade the hero composition**

Add a more editorial hero with:
- a stronger title block
- short orientation copy
- a small "how to browse" map / legend
- search framed as the primary interaction surface

**Step 2: Differentiate section types**

Keep the same information architecture, but visually separate:
- quick access
- navigation map
- current classroom picks
- recommended demonstrations
- library highlights
- complete archive

**Step 3: Improve card tone**

Give cards more subject-specific metadata framing and more varied hierarchy so they no longer all read as identical white rectangles.

### Task 4: Make the admin feel like a real workspace

**Files:**
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`
- Modify: `frontend/src/views/admin/AdminDashboardView.vue`

**Step 1: Re-style the admin shell**

Keep existing routing and focus behavior, but visually frame the admin as a control desk with stronger section identity and clearer active workspace context.

**Step 2: Rebuild the dashboard first screen**

Replace the flat metric-only first impression with a task-oriented workspace summary:
- next actions
- recent or common operations
- metrics as secondary support

**Step 3: Preserve mobile menu usability**

Retain the current focus-trap and overlay mechanics while making the small-screen header feel deliberate rather than compressed desktop UI.

### Task 5: Polish the viewer and run verification

**Files:**
- Modify: `frontend/src/views/ViewerView.vue`
- Verify: `scripts/ui_audit_capture.js`
- Verify: `scripts/smoke_spa_public.js`

**Step 1: Refine the viewer frame**

Keep all existing deferred iframe logic, but update the viewer chrome so the animation stage feels like a presentation surface instead of a plain iframe container.

**Step 2: Run targeted verification**

Run:
- `npm --prefix frontend run test -- frontend/test/app-shell-visual-polish.test.ts frontend/test/catalog-visual-polish.test.ts frontend/test/admin-visual-polish.test.ts frontend/test/viewer-actionbar.test.ts`
- `npm --prefix frontend run build`
- `SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/ui_audit_capture.js --tag teaching-atlas --viewport-only`

**Step 3: Review evidence**

Open the new screenshots and confirm:
- homepage hierarchy is visibly stronger
- admin shell feels distinct from the public catalog
- mobile layouts preserve clarity and touch comfort
