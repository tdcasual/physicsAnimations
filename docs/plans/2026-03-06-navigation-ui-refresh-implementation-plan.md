# Navigation UI Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the first usable navigation-first UI refresh across the public shell, public catalog homepage, and admin shell without changing the route model.

**Architecture:** Keep the existing Vue route structure and data hooks, but reorganize the shell and catalog templates into clearer navigation modules. Phase 1 focuses on public navigation and responsive interaction, while phase 2 upgrades the admin shell to a more structured workspace pattern using the same router and view composition.

**Tech Stack:** Vue 3, TypeScript, Vue Router, project CSS in `frontend/src/styles.css`, Vitest source-guard tests, existing smoke scripts.

---

### Task 1: Add public shell hierarchy and navigation affordances

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/styles.css`
- Test: `frontend/test/topbar-responsive.test.ts`
- Test: `frontend/test/app-shell-copy.test.ts`

**Step 1: Write the failing test**

Add assertions that the app shell now contains:
- a public brand subtitle or helper text
- a primary navigation affordance linking back to catalog
- stronger topbar structure classes for stacked mobile layout

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- --run topbar-responsive.test.ts app-shell-copy.test.ts`
Expected: FAIL because the current shell lacks the new public navigation hierarchy.

**Step 3: Write minimal implementation**

Update `frontend/src/App.vue` to:
- add a short subtitle under the brand title
- add a visible catalog/home link when not already on the homepage
- upgrade topbar action grouping for desktop and mobile

Update `frontend/src/styles.css` to:
- support the richer brand block
- improve topbar spacing and mobile stacking
- keep existing safe-area and scroll behavior intact

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- --run topbar-responsive.test.ts app-shell-copy.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/App.vue frontend/src/styles.css frontend/test/topbar-responsive.test.ts frontend/test/app-shell-copy.test.ts
git commit -m "feat(ui): strengthen public shell hierarchy"
```

### Task 2: Rebuild catalog page into navigation-first homepage

**Files:**
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/features/catalog/useCatalogViewState.ts`
- Modify: `frontend/src/styles.css`
- Test: `frontend/test/catalog-view-size.test.ts`
- Test: `frontend/test/catalog-service.test.ts`
- Create: `frontend/test/catalog-navigation-layout.test.ts`

**Step 1: Write the failing test**

Add tests that assert:
- the catalog includes a light hero section
- the page exposes quick access and recommended content sections
- mobile-specific filter affordances exist instead of relying only on inline tabs

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- --run catalog-navigation-layout.test.ts catalog-view-size.test.ts`
Expected: FAIL because the current catalog template is still a flat search + tabs + grid layout.

**Step 3: Write minimal implementation**

Update `CatalogView.vue` and any needed computed helpers to:
- derive a small recent/recommended/high-frequency model from current catalog state
- render hero, quick actions, grouped navigation, secondary filters, and curated sections
- keep the existing route behavior and item linking intact

Update shared CSS to:
- create clear hierarchy between hero, quick access, navigation, recommendations, and cards
- use responsive breakpoints for desktop, tablet, and mobile reflow
- keep card density balanced on small screens

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- --run catalog-navigation-layout.test.ts catalog-view-size.test.ts catalog-service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/views/CatalogView.vue frontend/src/features/catalog/useCatalogViewState.ts frontend/src/styles.css frontend/test/catalog-navigation-layout.test.ts frontend/test/catalog-view-size.test.ts frontend/test/catalog-service.test.ts
git commit -m "feat(ui): turn catalog into navigation-first homepage"
```

### Task 3: Add mobile-first filter drawer and context-preserving interactions

**Files:**
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/styles.css`
- Create: `frontend/test/catalog-mobile-filter-behavior.test.ts`
- Test: `frontend/test/router-scroll-behavior.test.ts`

**Step 1: Write the failing test**

Add tests that assert:
- mobile filter trigger exists
- mobile filter panel can be opened and closed through explicit UI state
- navigation sections are not all forced inline on small screens

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- --run catalog-mobile-filter-behavior.test.ts`
Expected: FAIL because the current small-screen pattern is only inline tabs.

**Step 3: Write minimal implementation**

Implement a small-screen filter drawer/panel in `CatalogView.vue` with local UI state and accessible controls. Keep desktop grouped navigation visible and preserve current category/group context when searching or switching sections.

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- --run catalog-mobile-filter-behavior.test.ts router-scroll-behavior.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/views/CatalogView.vue frontend/src/styles.css frontend/test/catalog-mobile-filter-behavior.test.ts frontend/test/router-scroll-behavior.test.ts
git commit -m "feat(ui): add mobile catalog navigation drawer"
```

### Task 4: Upgrade admin shell to a structured workspace

**Files:**
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`
- Modify: `frontend/src/styles.css`
- Test: `frontend/test/admin-layout-navigation.test.ts`
- Test: `frontend/test/admin-mobile-navigation-scroll.test.ts`
- Create: `frontend/test/admin-shell-structure.test.ts`

**Step 1: Write the failing test**

Add tests that assert:
- the admin shell exposes grouped workspace navigation
- the current page context has clearer heading support
- mobile admin navigation can collapse into a menu surface

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- --run admin-shell-structure.test.ts admin-layout-navigation.test.ts admin-mobile-navigation-scroll.test.ts`
Expected: FAIL because the current admin shell is still a flat horizontal nav.

**Step 3: Write minimal implementation**

Refactor `AdminLayoutView.vue` to:
- organize admin modules into groups
- introduce clearer header/context framing
- switch small-screen navigation to a controlled menu/drawer pattern

Update shared CSS for admin shell layout and responsive behavior.

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- --run admin-shell-structure.test.ts admin-layout-navigation.test.ts admin-mobile-navigation-scroll.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/views/admin/AdminLayoutView.vue frontend/src/styles.css frontend/test/admin-shell-structure.test.ts frontend/test/admin-layout-navigation.test.ts frontend/test/admin-mobile-navigation-scroll.test.ts
git commit -m "feat(ui): refresh admin workspace shell"
```

### Task 5: Run integrated verification and refresh docs

**Files:**
- Modify: `docs/guides/spa-and-frontend.md`
- Modify: `README.md`
- Test: `frontend/test/`

**Step 1: Write the failing test**

Only if needed, add or update source-guard tests for documented UI contracts.

**Step 2: Run targeted verification**

Run:
- `npm --prefix frontend run test -- --run`
- `npm run build:frontend`
- `npm run smoke:spa-public`
- `npm run smoke:spa-catalog-viewer`
- `npm run smoke:spa-admin`

Expected: all PASS

**Step 3: Update docs**

Document the new public navigation structure, responsive behavior, and admin shell expectations.

**Step 4: Run final verification**

Run: `npm run qa:release`
Expected: PASS

**Step 5: Commit**

```bash
git add docs/guides/spa-and-frontend.md README.md frontend
git commit -m "docs: document refreshed navigation ui"
```
