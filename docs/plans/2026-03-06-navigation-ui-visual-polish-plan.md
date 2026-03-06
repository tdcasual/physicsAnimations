# Navigation UI Visual Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine the refreshed navigation UI with a lighter tech-lab visual hierarchy and restrained micro-interactions, then capture before/after comparison screenshots.

**Architecture:** Keep the current route and component structure, but strengthen perceived hierarchy through CSS-only visual treatment and small stateful interaction cues. Focus on the public navigation homepage first, then keep the admin shell visually aligned so the product feels cohesive instead of split between two design languages.

**Tech Stack:** Vue 3, scoped CSS, global CSS guards, Vitest source tests, Playwright-driven screenshots.

---

### Task 1: Capture visual baseline

**Files:**
- Output: `output/playwright/nav-before-desktop.png`
- Output: `output/playwright/nav-before-mobile.png`

**Step 1: Start the local app stack and capture current public homepage screenshots**

Run a scripted Playwright capture for:
- desktop homepage at 1440px width
- mobile homepage at 390px width

**Step 2: Save the baseline artifacts**

Persist screenshots to `output/playwright/` with stable `before` filenames for comparison.

### Task 2: Add visual polish guard tests

**Files:**
- Create: `frontend/test/catalog-visual-polish.test.ts`
- Create: `frontend/test/admin-visual-polish.test.ts`

**Step 1: Write the failing tests**

Assert the catalog/admin styles now include:
- stronger layered hero treatment
- hover/press feedback for primary navigation cards or chips
- controlled transitions for the mobile drawer/menu surfaces
- subtle section framing for the admin workspace shell

**Step 2: Run tests to verify they fail**

Run: `npm --prefix frontend run test -- --run catalog-visual-polish.test.ts admin-visual-polish.test.ts`

### Task 3: Implement visual hierarchy and micro-interactions

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/views/CatalogView.css`
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`

**Step 1: Public shell polish**

Refine the topbar with:
- stronger backdrop and subtle edge highlight
- calmer but clearer button hover feedback
- better alignment between brand block and actions

**Step 2: Catalog homepage polish**

Refine the homepage with:
- layered hero surface and restrained accent glow
- stronger section heading rhythm and chip/card hierarchy
- card hover/press feedback for desktop
- mobile drawer/menu transitions that feel intentional

**Step 3: Admin shell polish**

Refine the workspace shell with:
- clearer separation between shell header, nav surface, and context card
- lightweight hover feedback on grouped nav pills
- small-screen menu surface that feels connected to the shell instead of detached

**Step 4: Run tests to verify they pass**

Run: `npm --prefix frontend run test -- --run catalog-visual-polish.test.ts admin-visual-polish.test.ts`

### Task 4: Capture comparison screenshots and verify

**Files:**
- Output: `output/playwright/nav-after-desktop.png`
- Output: `output/playwright/nav-after-mobile.png`

**Step 1: Capture polished screenshots**

Use the same scripted Playwright flow and viewport sizes as Task 1.

**Step 2: Run verification**

Run:
- `npm --prefix frontend run test -- --run`
- `npm run build:frontend`

