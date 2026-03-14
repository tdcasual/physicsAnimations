# Admin Library Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring `AdminLibraryView` into the same operational page language as the other admin secondary views without rewriting its data flow.

**Architecture:** Keep the existing library state/composable structure and three functional zones, but wrap the page in shared admin page-level semantics. Add a shared page header, a tighter workspace introduction, and lower-density visual framing so the library page reads like part of the same admin workspace instead of a separate CRUD console.

**Tech Stack:** Vue 3, scoped CSS, shared global admin tokens in `frontend/src/styles.css`, Vitest source-structure tests, Playwright screenshot audit

---

### Task 1: Lock the desired semantics in tests

**Files:**
- Modify: `frontend/test/admin-style-semantics.test.ts`
- Modify: `frontend/test/admin-visual-polish.test.ts`
- Modify: `frontend/test/library-admin-layout.test.ts`

**Step 1: Write the failing test**

Add assertions that require:
- `AdminLibraryView` to use `admin-page-header`, `admin-page-kicker`, `admin-page-intro`, `admin-page-meta`
- the library page to expose a workspace wrapper aligned with shared admin language
- the library page to avoid depending only on local `library-header` framing for page-level hierarchy

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- test/admin-style-semantics.test.ts test/admin-visual-polish.test.ts test/library-admin-layout.test.ts`
Expected: FAIL because the library page does not yet use the shared page-level admin semantics.

**Step 3: Write minimal implementation**

Update the library view shell, template, and CSS to add the shared page header and adapt the workbench framing.

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- test/admin-style-semantics.test.ts test/admin-visual-polish.test.ts test/library-admin-layout.test.ts`
Expected: PASS.

### Task 2: Apply shared admin language to the library shell

**Files:**
- Modify: `frontend/src/views/admin/AdminLibraryView.vue`
- Modify: `frontend/src/views/admin/library/AdminLibraryView.template.html`
- Modify: `frontend/src/views/admin/library/AdminLibraryView.css`

**Step 1: Keep the existing interaction model**

Preserve:
- `vm`-based state usage
- column components
- panel tabs
- mobile inspector focus helpers

**Step 2: Add shared page header semantics**

Introduce:
- shared page header copy with operational kicker
- a compact meta/status block using live counts
- a short intro that explains when to use the library page

**Step 3: Reduce visual fragmentation**

Update the library shell so that:
- the workbench sits under a shared intro rhythm
- section headings feel subordinate to the page header
- stats and tabs use the same admin tone instead of generic pill/chip styling

**Step 4: Keep mobile behavior intact**

Do not disturb:
- inspector focus anchors
- responsive column collapse
- existing panel tabs and form behaviors

### Task 3: Verify the change with targeted regressions and visual evidence

**Files:**
- Reuse existing tests and screenshot capture outputs

**Step 1: Run targeted admin regressions**

Run:
- `npm --prefix frontend run test -- test/admin-style-semantics.test.ts test/admin-visual-polish.test.ts test/library-admin-layout.test.ts test/admin-library-mobile-edit-focus.test.ts test/library-admin-empty-state-copy.test.ts`

Expected: PASS.

**Step 2: Run broader safety checks**

Run:
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`

Expected: both commands exit `0`.

**Step 3: Capture screenshots**

Run:
- `SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/ui_audit_capture.js --tag admin-library-unification --viewport-only`

Expected: fresh desktop/mobile screenshots for the admin library page with no console or page errors.
