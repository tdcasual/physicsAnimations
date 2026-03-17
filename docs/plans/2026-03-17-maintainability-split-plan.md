# Maintainability Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the current file-line-budget violations by splitting oversized frontend and script files into focused modules without changing user-facing behavior.

**Architecture:** Keep runtime behavior stable while moving bulky style blocks into dedicated stylesheet files, extracting static admin navigation config and app-shell helpers into small TypeScript modules, and isolating UI-audit runtime helpers under `scripts/lib/`. Update source-inspection tests so they can read split CSS/Vue sources instead of assuming every selector lives inline.

**Tech Stack:** Vue 3 SFCs, TypeScript, Vite, Vitest, Node test runner, plain CSS, Playwright helper scripts.

---

### Task 1: Add failing maintainability regression tests

**Files:**
- Modify: `frontend/test/app-shell-visual-polish.test.ts`
- Modify: `frontend/test/viewer-actionbar.test.ts`
- Modify: `frontend/test/library-folder-view.test.ts`
- Modify: `frontend/test/admin-shell-structure.test.ts`
- Modify: `tests/ui-audit-capture.test.js`
- Create: `frontend/test/helpers/sourceReader.ts`

**Step 1: Write failing tests**
- Assert `src/styles.css` uses stylesheet imports for split modules.
- Assert `src/views/ViewerView.vue`, `src/views/LibraryFolderView.vue`, and `src/views/admin/AdminLayoutView.vue` load external stylesheets.
- Assert `src/App.vue` imports an app-shell helper module.
- Assert `scripts/ui_audit_capture.js` delegates shared capture helpers to `scripts/lib/`.

**Step 2: Run tests to verify RED**
- Run: `npm --prefix frontend run test -- app-shell-visual-polish.test.ts viewer-actionbar.test.ts library-folder-view.test.ts admin-shell-structure.test.ts --run`
- Run: `npm test -- tests/ui-audit-capture.test.js`

### Task 2: Split frontend shell and view sources

**Files:**
- Modify: `frontend/src/App.vue`
- Create: `frontend/src/features/app/appShellTopbar.ts`
- Modify: `frontend/src/styles.css`
- Create: `frontend/src/styles/admin-base.css`
- Create: `frontend/src/styles/modal.css`
- Create: `frontend/src/views/ViewerView.css`
- Modify: `frontend/src/views/ViewerView.vue`
- Create: `frontend/src/views/LibraryFolderView.css`
- Modify: `frontend/src/views/LibraryFolderView.vue`
- Create: `frontend/src/views/admin/AdminLayoutView.css`
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`
- Create: `frontend/src/features/admin/adminNavConfig.ts`

**Step 1: Extract minimal helpers/config**
- Move topbar mode/search helper logic and admin navigation config into separate modules.

**Step 2: Externalize bulky style blocks**
- Replace inline `<style>` blocks with `src`-based stylesheets for the oversized view files.
- Convert `src/styles.css` into a small entry file with `@import` statements plus only the global rules that still belong at the root.

**Step 3: Keep behavior stable**
- Preserve existing class names, selectors, and DOM structure so behavior-oriented tests remain meaningful.

### Task 3: Split admin library and UI audit script

**Files:**
- Modify: `frontend/src/views/admin/library/AdminLibraryView.css`
- Create: `frontend/src/views/admin/library/AdminLibraryActivity.css`
- Modify: `scripts/ui_audit_capture.js`
- Create: `scripts/lib/ui_audit_capture_runtime.js`

**Step 1: Move operation-log CSS into a focused stylesheet**
- Keep `AdminLibraryView.css` as the entry file and import the extracted activity/log styles.

**Step 2: Extract UI audit runtime helpers**
- Move viewport orchestration and capture helper routines into `scripts/lib/ui_audit_capture_runtime.js` while keeping the public entrypoints and exported names in `scripts/ui_audit_capture.js`.

### Task 4: Update tests to read split sources and verify GREEN

**Files:**
- Modify: affected frontend Vitest source-inspection tests
- Modify: `tests/ui-audit-capture.test.js`

**Step 1: Implement source reader helper**
- Add a test helper that expands CSS `@import` and Vue `<style src>` references.

**Step 2: Switch impacted tests to the helper**
- Update tests that inspect `styles.css`, `ViewerView.vue`, `LibraryFolderView.vue`, `AdminLayoutView.vue`, and `AdminLibraryView.css` to use expanded source reads.

**Step 3: Run targeted validation**
- Run: `npm run guard:file-size`
- Run: `npm --prefix frontend run test -- app-shell-visual-polish.test.ts viewer-actionbar.test.ts library-folder-view.test.ts admin-shell-structure.test.ts topbar-responsive.test.ts mobile-touch-targets.test.ts library-admin-layout.test.ts admin-style-semantics.test.ts --run`
- Run: `npm test -- tests/ui-audit-capture.test.js`
