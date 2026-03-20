# UI Consolidation Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the current desktop and responsive refinement cycle by stabilizing admin shell actions, improving the desktop library first screen, and tightening the catalog stage balance without reintroducing noise on mobile.

**Architecture:** Keep the existing mobile-first structure and recently-added desktop refinements, then add a final consolidation layer through small template edits, denser desktop-only CSS, and source-level regression tests. Favor layout tightening and supporting context cards over new stateful abstractions so the responsive behavior stays easy to reason about.

**Tech Stack:** Vue 3 SFCs, scoped CSS, shared foundation tokens, Vitest source-structure tests, Vite frontend build, Playwright screenshot capture.

---

### Task 1: Lock the consolidation goals in tests

**Files:**
- Modify: `frontend/test/admin-visual-polish.test.ts`
- Modify: `frontend/test/library-admin-layout.test.ts`
- Modify: `frontend/test/catalog-visual-polish.test.ts` if the desktop stage balance changes

**Step 1: Write the failing tests**

- Add an admin shell assertion that requires a dedicated desktop toolbar wrapper for the status strip and home action so the header cannot visually spill past the right edge.
- Add a library assertion that requires a desktop summary row with both scale metrics and workflow-focus support, while keeping the extra support surface hidden on small screens.
- If catalog desktop ratios or right-rail behavior change, update the catalog test to lock the new stage split and rail alignment.

**Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix frontend run test -- test/admin-visual-polish.test.ts test/library-admin-layout.test.ts test/catalog-visual-polish.test.ts
```

Expected: failures describing missing toolbar wrappers or missing library desktop summary structure.

### Task 2: Stabilize the desktop admin shell toolbar

**Files:**
- Modify: `frontend/src/components/admin/AdminShellHeader.vue`
- Test: `frontend/test/admin-visual-polish.test.ts`

**Step 1: Write minimal implementation**

- Group the desktop status strip and home action into a shared toolbar row.
- Allow the toolbar to wrap and shrink safely so the shell header keeps both actions inside the header card at wide and medium-desktop widths.
- Keep the current compact mobile app-bar behavior intact.

**Step 2: Run targeted tests**

Run:

```bash
npm --prefix frontend run test -- test/admin-visual-polish.test.ts
```

Expected: admin visual polish assertions pass.

### Task 3: Fill the desktop library first-screen gap with workflow support

**Files:**
- Modify: `frontend/src/views/admin/library/AdminLibraryView.template.html`
- Modify: `frontend/src/views/admin/library/AdminLibraryView.css`
- Test: `frontend/test/library-admin-layout.test.ts`

**Step 1: Add a second desktop summary panel**

- Keep the existing metrics card.
- Add a desktop-only focus/support card that clarifies the three-zone library workflow and reflects the current folder or current action.
- Make the summary row a balanced desktop grid, but hide the extra support card on small screens so mobile stays quieter.

**Step 2: Run targeted tests**

Run:

```bash
npm --prefix frontend run test -- test/library-admin-layout.test.ts
```

Expected: library layout assertions pass.

### Task 4: Tighten the desktop catalog stage balance

**Files:**
- Modify: `frontend/src/views/CatalogView.css`
- Possibly modify: `frontend/src/components/catalog/CatalogTeacherQuickAccessArea.vue`
- Test: `frontend/test/catalog-visual-polish.test.ts`

**Step 1: Adjust the desktop split only if the current screenshot still feels right-rail heavy**

- Narrow or align the supporting rail so the featured content feels primary and lower-right whitespace is reduced.
- Preserve the current simplified mobile disclosure behavior.

**Step 2: Run targeted tests**

Run:

```bash
npm --prefix frontend run test -- test/catalog-visual-polish.test.ts
```

Expected: catalog desktop layout assertions pass.

### Task 5: Verify with targeted tests, build, and fresh screenshots

**Files:**
- No source changes expected

**Step 1: Run the focused regression suite**

Run:

```bash
npm --prefix frontend run test -- test/catalog-visual-polish.test.ts test/catalog-navigation-layout.test.ts test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts test/admin-style-semantics.test.ts test/library-admin-layout.test.ts test/login-visual-polish.test.ts test/login-flow-consistency.test.ts test/app-shell-copy.test.ts test/topbar-responsive.test.ts test/viewer-actionbar.test.ts
```

Expected: all targeted tests pass.

**Step 2: Run the build**

Run:

```bash
npm run build:frontend
```

Expected: Vite build succeeds with exit code 0.

**Step 3: Capture fresh screenshots**

Use the existing UI audit capture flow to review:
- desktop catalog
- desktop viewer
- desktop admin dashboard
- desktop admin library
- mobile admin library or taxonomy if the desktop adjustments touch shared chrome

Expected: the final screenshot set confirms tighter desktop framing and unchanged low-noise mobile behavior.
