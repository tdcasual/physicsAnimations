# Admin Mobile Progressive Disclosure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the mobile admin experience for `library` and `taxonomy` by reducing simultaneous information density, moving editing into bottom sheets, and preserving the richer desktop workspace.

**Architecture:** Keep the existing routes, view models, and desktop layout logic intact. Add mobile-only structure and styling inside the current Vue views so phones use task-first progressive disclosure: pick context first, then browse list/tree, then edit in a dedicated sheet. Use source-level tests to lock the intended responsive structure before implementation.

**Tech Stack:** Vue 3 Composition API, scoped CSS, shared admin tokens, Vitest source-structure tests, frontend build, Playwright UI audit screenshots

---

### Task 1: Lock the mobile simplification goals in tests

**Files:**
- Modify: `frontend/test/admin-visual-polish.test.ts`
- Modify: `frontend/test/admin-shell-structure.test.ts`

**Step 1: Write the failing test**

Add assertions that require:
- `AdminLibraryView` to expose a mobile task summary / step framing instead of relying only on the desktop three-zone workbench
- `AdminLibraryView` mobile CSS to collapse folder creation and inspector editing into sheet-style surfaces
- `AdminTaxonomyView` to expose a mobile tree-first action bar and dismissible editor sheet
- `TaxonomyTreePanel` to expose mobile-friendly quick actions without keeping the editor visible inline

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts`
Expected: FAIL because the required mobile structure and CSS hooks do not exist yet.

**Step 3: Write minimal implementation**

Update the views and styles only enough to satisfy the test assertions while preserving current desktop behavior.

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts`
Expected: PASS.

### Task 2: Convert library mobile into a 3-step flow

**Files:**
- Modify: `frontend/src/views/admin/AdminLibraryView.vue`
- Modify: `frontend/src/views/admin/library/AdminLibraryView.template.html`
- Modify: `frontend/src/views/admin/library/AdminLibraryView.css`

**Step 1: Keep current desktop workbench semantics**

Preserve:
- desktop sidebar + list + inspector relationship
- existing `vm` actions and panel tab state
- current folder/asset/edit functionality

**Step 2: Add mobile task framing**

Introduce:
- a compact mobile summary bar showing current folder and selected asset/edit state
- explicit mobile entry actions for “选文件夹”, “新建文件夹”, and “上传/编辑资源”
- a smaller first screen that prioritizes folder picking and current list context

**Step 3: Move mobile secondary work into sheets**

On mobile:
- turn folder creation into a bottom sheet instead of an always-open sidebar form
- turn inspector operations into a bottom sheet instead of a simultaneously visible third zone
- keep asset browsing inline, but move editing/upload emphasis into the sheet

**Step 4: Keep desktop untouched**

Ensure:
- desktop still renders the richer multi-column layout
- sticky behavior remains on larger breakpoints
- no route or composable rewrites are required

### Task 3: Convert taxonomy mobile into tree-first editing

**Files:**
- Modify: `frontend/src/views/admin/AdminTaxonomyView.vue`
- Modify: `frontend/src/views/admin/taxonomy/TaxonomyTreePanel.vue`
- Modify: `frontend/src/views/admin/taxonomy/GroupEditorPanel.vue`
- Modify: `frontend/src/views/admin/taxonomy/CategoryEditorPanel.vue`

**Step 1: Keep desktop master-detail behavior**

Preserve:
- desktop tree + editor slot structure
- existing search, expand/collapse, and selection logic
- group/category editor forms

**Step 2: Add mobile action framing**

Introduce:
- a compact mobile operations strip above the tree
- clear task actions such as “新建大类” and “关闭编辑”
- current selection feedback without keeping both panes visible

**Step 3: Turn mobile editor into a bottom sheet**

On mobile:
- render selected group/category editing inside a dismissible sheet
- keep the tree as the primary visible surface
- support create-group and create-category entry points from the tree-first flow

**Step 4: Reduce visual noise in the editor**

Simplify mobile forms by:
- tightening headings and helper copy
- making footer actions sticky
- emphasizing primary action order and safe dismissal

### Task 4: Verify with focused regressions, build, and screenshots

**Files:**
- Reuse existing tests and Playwright outputs under `output/playwright/ui-audit/`

**Step 1: Run targeted regression tests**

Run: `npm --prefix frontend run test -- test/admin-shell-structure.test.ts test/admin-visual-polish.test.ts test/topbar-responsive.test.ts test/topbar-mobile-more-discoverability.test.ts test/catalog-mobile-filter-behavior.test.ts test/catalog-visual-polish.test.ts test/viewer-actionbar.test.ts`
Expected: PASS.

**Step 2: Run frontend build**

Run: `npm run build:frontend`
Expected: exit `0`.

**Step 3: Capture fresh UI audit screenshots**

Run: `ADMIN_USERNAME=admin ADMIN_PASSWORD=admin SMOKE_ADMIN_USERNAME=admin SMOKE_ADMIN_PASSWORD=admin node scripts/ui_audit_capture.js --tag=visual-audit-20260319d`
Expected: fresh mobile and desktop screenshots for admin library and taxonomy flows.

**Step 4: Review responsive behavior**

Inspect the new screenshots to confirm:
- mobile shows fewer concurrent panels
- primary actions stay reachable within thumb range
- desktop retains higher information density without collapsed task flow regressions
