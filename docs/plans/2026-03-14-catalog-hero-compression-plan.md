# Catalog Hero Compression Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the public catalog hero's cognitive load while preserving fast discovery, then trim duplicate admin shell explanation so secondary pages carry more of their own hierarchy.

**Architecture:** Keep the existing catalog data flow, hero actions, mobile filter behavior, and admin grouped navigation. Compress the catalog hero by merging status and itinerary into a lighter overview rail under the main copy, and keep search plus primary actions as the dominant controls. In the admin shell, preserve the current layout and mobile workspace menu but tighten the shared shell copy so it stops repeating the same module description at multiple levels.

**Tech Stack:** Vue 3, scoped CSS, shared token system in `frontend/src/styles.css`, Vitest source-structure tests, Vite

---

### Task 1: Lock the lighter public-hero structure in tests

**Files:**
- Modify: `frontend/test/catalog-navigation-layout.test.ts`
- Modify: `frontend/test/catalog-visual-polish.test.ts`
- Modify: `frontend/test/admin-shell-structure.test.ts`

**Step 1: Write the failing test**

Add assertions that require:
- the catalog hero to expose a compact overview block instead of separate `catalog-hero-status` and `catalog-hero-itinerary` decks
- the hero to keep search and primary actions as the main visible controls
- the admin shell to keep grouped navigation and context framing while reducing repeated descriptive copy

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/admin-shell-structure.test.ts`

Expected: FAIL because the current catalog hero still uses two explanatory card decks and the admin shell still duplicates module description copy.

**Step 3: Write minimal implementation**

Update the hero and shell source to satisfy the new structure with minimal behavioral change.

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/admin-shell-structure.test.ts`

Expected: PASS

### Task 2: Compress the catalog hero into a lighter guided entry

**Files:**
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/CatalogView.css`
- Possibly modify: `frontend/src/features/catalog/useCatalogViewState.ts`

**Step 1: Keep the current browsing logic**

Preserve:
- `useCatalogViewState()` and current section calculations
- hero action anchors and primary CTA behavior
- mobile filter panel, grouped navigation, and lower-page curated sections

**Step 2: Replace stacked explanation cards with one compact guidance rail**

Introduce:
- one compact overview area that summarizes current focus, recommended next step, and archive fallback
- lighter copy that avoids repeating the same browsing instructions in multiple formats
- a hero composition where search and actions stay more prominent than supporting explanation

**Step 3: Reduce visual repetition**

Update the hero shell so that:
- secondary information reads as a single supporting block, not multiple competing decks
- the map/support area remains distinctive but lighter than the primary copy
- mobile first view reaches a meaningful action sooner

**Step 4: Keep the page distinctive**

Retain:
- the teaching-atlas editorial tone
- the layered hero surface and motion rhythm
- the public-facing invitational tone instead of turning it into a utilitarian admin panel

### Task 3: Trim duplicated admin shell explanation without changing navigation behavior

**Files:**
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`
- Possibly modify: `frontend/test/admin-visual-polish.test.ts`

**Step 1: Preserve shell behavior**

Do not disturb:
- grouped workspace navigation
- mobile workspace menu behavior and focus trap
- current section resolution and document title

**Step 2: Compress shared shell copy**

Adjust:
- shell status strip so it adds context instead of repeating the current module description verbatim
- current workspace card so it complements child pages rather than restating the same explanation again

**Step 3: Keep the admin shell operational**

Ensure the result still reads like a work surface:
- faster
- denser
- less brochure-like than the public catalog

### Task 4: Verify the refinement round with targeted regressions

**Files:**
- Reuse existing source-structure tests and app checks

**Step 1: Run targeted UI tests**

Run:
- `npm --prefix frontend run test -- test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/admin-shell-structure.test.ts test/app-shell-visual-polish.test.ts test/catalog-hero-actions.test.ts test/catalog-home-sections.test.ts`

Expected: PASS

**Step 2: Run broader safety checks**

Run:
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`

Expected: both commands exit `0`

**Step 3: Capture visual evidence if structure changed materially**

Run:
- `SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/ui_audit_capture.js --tag catalog-hero-compression --viewport-only`

Expected:
- fresh desktop/mobile public catalog screenshots
- fresh admin dashboard/library screenshots if admin shell appearance changed
