# Teaching Atlas Next Design Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the shell-control hierarchy, turn the viewer into a true presentation stage, and visually separate the admin workspace from the public atlas without losing brand continuity.

**Architecture:** Keep the existing teaching-atlas token system and editorial tone, but tighten context-specific hierarchy. The shared shell remains the base system, while the viewer and admin areas get stronger role-specific composition, copy emphasis, and interaction framing. Follow TDD with source-assertion tests first, then minimal Vue/CSS implementation, then screenshot verification.

**Tech Stack:** Vue 3, Vue Router, scoped CSS, shared global CSS tokens, Vitest source tests, Playwright smoke/audit screenshots, Vite

---

### Task 1: Fix and simplify global shell controls

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/AppShell.css`
- Test: `frontend/test/topbar-responsive.test.ts`
- Test: `frontend/test/app-shell-copy.test.ts`
- Test: `frontend/test/app-shell-visual-polish.test.ts`
- Test: `frontend/test/login-flow-consistency.test.ts`

**Step 1: Write the failing tests**

Add or tighten assertions for:
- the mobile-only visibility contract of `topbar-mobile-toggle`
- a clearer environment-control label/copy strategy in the shell
- desktop shell utility grouping that does not leak the mobile disclosure trigger

**Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix frontend run test -- test/topbar-responsive.test.ts test/app-shell-copy.test.ts test/app-shell-visual-polish.test.ts test/login-flow-consistency.test.ts
```

Expected: FAIL because the current shell still exposes the compact control trigger in desktop screenshots and uses generic environment wording.

**Step 3: Write minimal implementation**

Implementation goals:
- make the compact utility trigger truly mobile-only at the CSS cascade level
- rename and regroup shell utility controls so they read as environment settings rather than peer navigation actions
- keep login/admin primary actions visually separate from environment toggles
- preserve safe-area, sticky topbar height sync, and modal/login behavior

**Step 4: Run tests to verify they pass**

Run:

```bash
npm --prefix frontend run test -- test/topbar-responsive.test.ts test/app-shell-copy.test.ts test/app-shell-visual-polish.test.ts test/login-flow-consistency.test.ts
```

Expected: PASS

**Step 5: Visual verification**

Run:

```bash
SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/ui_audit_capture.js --tag teaching-atlas-shell-pass --viewport-only
```

Inspect:
- `output/playwright/ui-audit/teaching-atlas-shell-pass-desktop-catalog.png`
- `output/playwright/ui-audit/teaching-atlas-shell-pass-mobile-login-page.png`

Success criteria:
- no compact utility trigger on desktop
- mobile topbar feels quieter than desktop
- primary action remains obvious on public and admin routes

### Task 2: Turn the viewer into the flagship presentation surface

**Files:**
- Modify: `frontend/src/views/ViewerView.vue`
- Possibly modify: `frontend/src/features/viewer/viewerService.ts`
- Test: `frontend/test/viewer-actionbar.test.ts`
- Test: `frontend/test/viewer-screenshot-layout.test.ts`
- Test: `frontend/test/viewer-sticky-offset.test.ts`

**Step 1: Write the failing tests**

Add assertions for:
- a stronger stage wrapper or presentation frame class
- clearer separation between stage controls, hint rail, and content surface
- viewer-specific visual hooks for screenshot mode versus live interaction mode

**Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix frontend run test -- test/viewer-actionbar.test.ts test/viewer-screenshot-layout.test.ts test/viewer-sticky-offset.test.ts
```

Expected: FAIL because the current viewer is still mostly a refined container rather than a staged presentation surface.

**Step 3: Write minimal implementation**

Implementation goals:
- make the viewer read like a classroom stage, not a generic preview wrapper
- tighten the action bar and move secondary explanatory copy out of the main visual path
- emphasize the stage frame, title treatment, and mode transitions
- preserve current deferred-iframe and screenshot-mode safety behavior

**Step 4: Run tests to verify they pass**

Run:

```bash
npm --prefix frontend run test -- test/viewer-actionbar.test.ts test/viewer-screenshot-layout.test.ts test/viewer-sticky-offset.test.ts
```

Expected: PASS

**Step 5: Visual verification**

Run:

```bash
SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/smoke_spa_public.js
```

Inspect:
- `output/playwright/spa-public-smoke-viewer.png`

Success criteria:
- stage dominates the page
- controls feel subordinate but accessible
- screenshot and live modes still appear intentional rather than accidental

### Task 3: Separate admin tone from public tone

**Files:**
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`
- Modify: `frontend/src/views/admin/AdminDashboardView.vue`
- Possibly modify: `frontend/src/styles.css`
- Test: `frontend/test/admin-visual-polish.test.ts`
- Test: `frontend/test/admin-layout-navigation.test.ts`
- Test: `frontend/test/admin-shell-structure.test.ts`
- Test: `frontend/test/admin-style-semantics.test.ts`

**Step 1: Write the failing tests**

Add assertions for:
- stronger task/workspace framing classes in the admin shell
- a denser, more operational treatment of workspace navigation or status blocks
- dashboard hooks that distinguish admin actions from public discovery cards

**Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix frontend run test -- test/admin-visual-polish.test.ts test/admin-layout-navigation.test.ts test/admin-shell-structure.test.ts test/admin-style-semantics.test.ts
```

Expected: FAIL because the admin layer still shares too much of the public tone.

**Step 3: Write minimal implementation**

Implementation goals:
- keep the same brand system, but reduce atmosphere and increase operational clarity
- make admin navigation feel more decisive and tool-like
- compress explanatory copy where it currently repeats context
- let public pages stay invitational while admin pages feel execution-oriented

**Step 4: Run tests to verify they pass**

Run:

```bash
npm --prefix frontend run test -- test/admin-visual-polish.test.ts test/admin-layout-navigation.test.ts test/admin-shell-structure.test.ts test/admin-style-semantics.test.ts
```

Expected: PASS

**Step 5: Visual verification**

Run:

```bash
SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/ui_audit_capture.js --tag teaching-atlas-admin-pass --viewport-only
```

Inspect:
- `output/playwright/ui-audit/teaching-atlas-admin-pass-desktop-admin-dashboard.png`
- `output/playwright/ui-audit/teaching-atlas-admin-pass-mobile-admin-dashboard.png`

Success criteria:
- admin feels faster and denser than public
- navigation remains readable on mobile
- dashboard reads as a working surface, not a brochure

### Task 4: Final regression and release-quality verification

**Files:**
- Recheck all modified files above

**Step 1: Run the broad UI regression suite**

Run:

```bash
npm --prefix frontend run test -- test/app-shell-visual-polish.test.ts test/app-shell-copy.test.ts test/topbar-responsive.test.ts test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/catalog-mobile-filter-behavior.test.ts test/catalog-anchor-offset.test.ts test/admin-shell-structure.test.ts test/admin-layout-navigation.test.ts test/admin-visual-polish.test.ts test/admin-style-semantics.test.ts test/admin-dashboard-race.test.ts test/mobile-touch-targets.test.ts test/viewer-actionbar.test.ts test/viewer-screenshot-layout.test.ts test/viewer-sticky-offset.test.ts test/library-folder-view.test.ts test/login-visual-polish.test.ts test/login-flow-consistency.test.ts test/public-document-title.test.ts test/return-navigation.test.ts
```

Expected: PASS

**Step 2: Run typecheck and build**

Run:

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Expected: PASS

**Step 3: Review critical screenshots**

Review the latest generated screenshots for:
- public desktop/mobile catalog
- public desktop/mobile login
- public viewer
- admin desktop/mobile dashboard

Only call the phase complete after:
- fresh tests are green
- build succeeds
- screenshots confirm the shell/viewer/admin hierarchy changes are visually real
