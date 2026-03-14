# Quick Access And Admin Header Tightening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Compress the public catalog quick-access block into a denser entry band and tighten the admin shell header so page content reaches the first actionable area faster.

**Architecture:** Keep the catalog hero, quick-category actions, and admin grouped navigation exactly as they work today. Reframe the quick-access section as a compact horizontal tool band with its own explicit structure classes, and add a compact admin shell header modifier that trims vertical rhythm without removing context. Use TDD with source-structure tests first, then minimal Vue/CSS implementation, then screenshot verification.

**Tech Stack:** Vue 3, scoped CSS, shared token system in `frontend/src/styles.css`, Vitest source-structure tests, Vite

---

### Task 1: Lock the denser structure in tests

**Files:**
- Modify: `frontend/test/catalog-navigation-layout.test.ts`
- Modify: `frontend/test/catalog-visual-polish.test.ts`
- Modify: `frontend/test/admin-shell-structure.test.ts`
- Possibly modify: `frontend/test/admin-visual-polish.test.ts`

**Step 1: Write the failing test**

Add assertions that require:
- the quick-access section to expose a dedicated compact band structure such as `catalog-quick-access-band` and `catalog-quick-access-copy`
- the quick-access section to avoid relying only on the generic section heading stack
- the admin shell header to expose an explicit compact modifier or compact summary row

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts`

Expected: FAIL because the current quick-access block is still a large generic section and the admin header has no explicit compact treatment hook.

**Step 3: Write minimal implementation**

Add the new structural classes and update the related CSS.

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts`

Expected: PASS

### Task 2: Turn quick access into a compact entry band

**Files:**
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/CatalogView.css`

**Step 1: Preserve behavior**

Keep:
- existing quick category buttons
- resource library shortcut
- mobile touch target sizing

**Step 2: Restructure the section**

Introduce:
- a compact copy area that reads like an entry guide instead of a full content section
- a chip rail that visually fills the section and reduces blank paper space
- tighter spacing and a more horizontal composition on desktop

**Step 3: Preserve mobile clarity**

Ensure:
- chips still stack cleanly on narrow screens
- the copy remains readable without increasing first-screen height

### Task 3: Tighten the admin shell header

**Files:**
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`

**Step 1: Preserve navigation and context behavior**

Do not change:
- current section resolution
- grouped admin navigation
- mobile workspace trigger and focus management

**Step 2: Add an explicit compact shell mode**

Introduce:
- a compact header modifier class or compact summary row
- shorter spacing and a tighter relationship between title, current module, and shell note
- no new explanatory copy

**Step 3: Keep the shell readable**

Ensure:
- admin still feels operational and intentional
- primary navigation remains obvious on both desktop and mobile

### Task 4: Verify the round

**Files:**
- Reuse current UI tests and screenshot tooling

**Step 1: Run targeted regressions**

Run:
- `npm --prefix frontend run test -- test/catalog-navigation-layout.test.ts test/catalog-visual-polish.test.ts test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts test/mobile-touch-targets.test.ts`

Expected: PASS

**Step 2: Run safety checks**

Run:
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`

Expected: both commands exit `0`

**Step 3: Capture screenshots**

Run:
- `SMOKE_ADMIN_USERNAME=designreview SMOKE_ADMIN_PASSWORD=designreview node scripts/ui_audit_capture.js --tag quick-access-tightening --viewport-only`

Expected:
- fresh public catalog desktop/mobile screenshots showing a denser quick-access block
- fresh admin screenshots showing a tighter shell header
