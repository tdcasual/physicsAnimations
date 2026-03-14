# Teaching Atlas Priority UI Refine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strengthen the public entry hero, reduce mobile topbar noise, and make library asset states easier to scan.

**Architecture:** Keep the existing teaching-atlas visual language, but sharpen hierarchy instead of introducing a new system. Use test-first string assertions for new structural hooks, then make minimal Vue and CSS changes in the existing app shell, catalog page, and library folder view.

**Tech Stack:** Vue 3, Vue Router, scoped CSS, Vitest string/source tests, Vite

---

### Task 1: Plan and failing tests

**Files:**
- Modify: `frontend/test/topbar-responsive.test.ts`
- Modify: `frontend/test/catalog-visual-polish.test.ts`
- Modify: `frontend/test/library-folder-view.test.ts`

**Step 1: Write failing tests**

Add assertions for:
- a compact mobile utility toggle and panel in the app shell
- a stronger catalog hero route/planning module
- explicit embed/download asset state classes and badges in the library folder view

**Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix frontend run test -- test/topbar-responsive.test.ts test/catalog-visual-polish.test.ts test/library-folder-view.test.ts
```

Expected: FAIL because the new class hooks and structures do not exist yet.

### Task 2: Implement the UI changes

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/CatalogView.css`
- Modify: `frontend/src/views/LibraryFolderView.vue`

**Step 1: Update the app shell**

Add a compact utility toggle/panel for narrow screens while keeping primary actions visible.

**Step 2: Update the catalog hero**

Add a stronger left-column planning block so the desktop hero has a second focal point and clearer route narrative.

**Step 3: Update the library folder view**

Differentiate embed-ready and download-only assets with state badges and variant card styling.

### Task 3: Verify and polish

**Files:**
- Recheck modified files above

**Step 1: Run targeted tests**

```bash
npm --prefix frontend run test -- test/topbar-responsive.test.ts test/catalog-visual-polish.test.ts test/library-folder-view.test.ts test/app-shell-visual-polish.test.ts test/app-shell-copy.test.ts test/mobile-touch-targets.test.ts
```

Expected: PASS

**Step 2: Run broader confidence checks**

```bash
npm --prefix frontend run test -- test/login-flow-consistency.test.ts test/catalog-navigation-layout.test.ts test/catalog-mobile-filter-behavior.test.ts test/return-navigation.test.ts
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Expected: PASS
