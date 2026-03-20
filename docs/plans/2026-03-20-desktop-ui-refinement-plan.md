# Desktop UI Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the desktop experience feel intentionally designed for wider screens by prioritizing content on the catalog, compressing repeated admin chrome, widening desktop work areas, and giving the login page stronger context.

**Architecture:** Keep the existing mobile-first behavior intact while layering desktop-only refinements through route-aware shell classes, denser desktop header treatments, and content-first section ordering. Favor CSS and small template restructures over new stateful abstractions so the changes stay easy to reason about and regression-test.

**Tech Stack:** Vue 3 SFCs, scoped CSS, shared design tokens in `frontend/src/styles/foundation.css`, Vitest source-based layout tests, Playwright screenshot capture scripts.

---

### Task 1: Add desktop-focused regression tests

**Files:**
- Modify: `frontend/test/catalog-visual-polish.test.ts`
- Modify: `frontend/test/admin-visual-polish.test.ts`
- Modify: `frontend/test/login-visual-polish.test.ts`
- Modify: `frontend/test/app-shell-copy.test.ts` if route-specific shell classes need protection

**Step 1: Write failing tests**

- Add a catalog test proving the desktop stage promotes first-screen content instead of only showing quick-access chrome.
- Add an admin test proving the desktop shell becomes denser and the admin route gets a wider main work area.
- Add a login test proving the desktop login page includes contextual support copy instead of a lone form card.

**Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix frontend run test -- test/catalog-visual-polish.test.ts test/admin-visual-polish.test.ts test/login-visual-polish.test.ts
```

Expected: targeted failures describing missing desktop layout rules or markup.

### Task 2: Widen and route-tune the desktop shell

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/styles/foundation.css`
- Test: `frontend/test/admin-visual-polish.test.ts`

**Step 1: Write minimal implementation**

- Add route-aware `app-main` classes so desktop widths can differ between catalog, viewer, admin, and login surfaces.
- Keep the global default intact, then give admin and catalog/login their own wider desktop caps instead of relying on classroom mode.

**Step 2: Run targeted tests**

Run:

```bash
npm --prefix frontend run test -- test/admin-visual-polish.test.ts
```

Expected: desktop width assertions pass.

### Task 3: Recompose the desktop catalog first screen

**Files:**
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/CatalogView.css`
- Modify: `frontend/src/components/catalog/CatalogTeacherQuickAccessArea.vue`
- Modify: `frontend/src/components/catalog/CatalogTeacherQuickAccessSection.vue`
- Modify: `frontend/src/components/catalog/CatalogTeacherWorkspaceEmptyState.vue`
- Test: `frontend/test/catalog-visual-polish.test.ts`
- Test: `frontend/test/catalog-navigation-layout.test.ts`

**Step 1: Implement content-first desktop layout**

- Create a desktop-only stage composition that surfaces current or recommended content in the first screen.
- Reduce empty workbench vertical weight on desktop and make the teaching strip feel like a supporting rail, not the main attraction.
- Keep mobile disclosure behavior unchanged.

**Step 2: Run targeted tests**

Run:

```bash
npm --prefix frontend run test -- test/catalog-visual-polish.test.ts test/catalog-navigation-layout.test.ts
```

Expected: catalog desktop layout assertions pass.

### Task 4: Compress repeated admin chrome for desktop

**Files:**
- Modify: `frontend/src/components/admin/AdminShellHeader.vue`
- Modify: `frontend/src/views/admin/AdminLayoutView.css`
- Modify: `frontend/src/styles/admin-base.css`
- Test: `frontend/test/admin-visual-polish.test.ts`

**Step 1: Implement denser desktop admin framing**

- Tighten the admin shell header so the current section, group context, and home action read as one operational toolbar.
- Reduce repeated explanatory copy and let the page-level headers carry the secondary context.
- Keep mobile app-bar behavior untouched.

**Step 2: Run targeted tests**

Run:

```bash
npm --prefix frontend run test -- test/admin-visual-polish.test.ts test/admin-shell-structure.test.ts
```

Expected: admin shell and visual polish tests pass.

### Task 5: Strengthen the desktop login entry

**Files:**
- Modify: `frontend/src/views/LoginView.vue`
- Test: `frontend/test/login-visual-polish.test.ts`

**Step 1: Implement a more grounded desktop login composition**

- Add concise support copy and a secondary context block so the form does not float alone in a large empty field.
- Preserve the current form flow and mobile behavior.

**Step 2: Run targeted tests**

Run:

```bash
npm --prefix frontend run test -- test/login-visual-polish.test.ts test/login-flow-consistency.test.ts
```

Expected: login visual and flow tests pass.

### Task 6: Full verification and visual audit

**Files:**
- No source changes expected

**Step 1: Run the focused desktop verification suite**

Run:

```bash
npm --prefix frontend run test -- test/catalog-visual-polish.test.ts test/catalog-navigation-layout.test.ts test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts test/login-visual-polish.test.ts test/login-flow-consistency.test.ts test/topbar-responsive.test.ts
```

Expected: all targeted tests pass.

**Step 2: Run the build**

Run:

```bash
npm run build:frontend
```

Expected: Vite build succeeds with exit code 0.

**Step 3: Capture fresh desktop screenshots**

Run the local Playwright capture flow against the running app for:
- catalog desktop
- viewer desktop
- admin dashboard desktop
- admin library desktop
- login desktop

Expected: a fresh screenshot set for visual comparison.
