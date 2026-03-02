# UI Interaction Taskflow Phase A Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改后端接口的前提下，完成第一批高优先级交互改造：`Content/Uploads` 的“列表+编辑面板”结构、局部操作反馈，以及 `Viewer` 固定操作条与模式状态可见化。

**Architecture:** 采用“测试先行 + 最小可行结构重排”策略。优先新增静态结构与交互守卫测试，确认失败后再重构 Vue 页面结构和样式。所有改造限定在前端视图层与局部状态层，不改 API 协议与服务端逻辑。

**Tech Stack:** Vue 3, TypeScript, scoped CSS, Vitest.

---

Related skills during execution: `@superpowers:test-driven-development`, `@superpowers:verification-before-completion`, `@skills:playwright`.

### Task 0: Baseline Verification

**Files:**
- None (verification only)

**Step 1: Run frontend test baseline**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm run test
```

Expected: existing frontend tests pass before modifications.

**Step 2: Commit checkpoint (no changes)**

No commit required.

---

### Task 1: Add failing tests for Content/Uploads split layout and local feedback

**Files:**
- Create: `frontend/test/admin-edit-panel-layout.test.ts`
- Modify (later): `frontend/src/views/admin/AdminContentView.vue`
- Modify (later): `frontend/src/views/admin/AdminUploadsView.vue`

**Step 1: Write failing tests**

Add test expectations for both files:
- has `.workspace-grid` layout container
- has separate `.list-panel` and `.editor-panel`
- uses local status text near editor actions (`.action-feedback`)
- no inline `.item-edit` region rendered in list loop

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm run test -- test/admin-edit-panel-layout.test.ts
```

Expected: FAIL (new structure absent).

**Step 3: Commit**

No commit in this task.

---

### Task 2: Implement Content “list + editor panel” and local feedback

**Files:**
- Modify: `frontend/src/views/admin/AdminContentView.vue`
- Test: `frontend/test/admin-edit-panel-layout.test.ts`

**Step 1: Minimal implementation**

Refactor page layout:
- add `workspace-grid` with two panels
- keep list card actions for select/preview/delete/restore only
- move edit form to dedicated `editor-panel`
- add local action feedback text in editor action row
- keep existing API calls and request sequencing behavior

**Step 2: Run target tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm run test -- test/admin-edit-panel-layout.test.ts test/ui-interaction-guardrails.test.ts
```

Expected: PASS.

**Step 3: Commit**

```bash
git add frontend/src/views/admin/AdminContentView.vue frontend/test/admin-edit-panel-layout.test.ts
git commit -m "test+refactor(admin): split content list and editor panel"
```

---

### Task 3: Implement Uploads “list + editor panel” and local feedback

**Files:**
- Modify: `frontend/src/views/admin/AdminUploadsView.vue`
- Test: `frontend/test/admin-edit-panel-layout.test.ts`

**Step 1: Minimal implementation**

Refactor page layout:
- same split structure as Content
- list panel handles browsing + selection
- editor panel handles metadata editing for selected upload
- keep upload form in list panel
- add local action feedback for save/delete/upload actions

**Step 2: Run target tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm run test -- test/admin-edit-panel-layout.test.ts test/ui-interaction-guardrails.test.ts
```

Expected: PASS.

**Step 3: Commit**

```bash
git add frontend/src/views/admin/AdminUploadsView.vue frontend/test/admin-edit-panel-layout.test.ts
git commit -m "refactor(admin): split uploads list and editor panel"
```

---

### Task 4: Add failing test and implement Viewer fixed action bar + mode state text

**Files:**
- Create: `frontend/test/viewer-actionbar.test.ts`
- Modify: `frontend/src/views/ViewerView.vue`

**Step 1: Write failing test**

Test expects:
- `.viewer-bar` includes sticky behavior styles
- template includes explicit mode state text block (`.viewer-mode-state`)

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm run test -- test/viewer-actionbar.test.ts
```

Expected: FAIL.

**Step 3: Minimal implementation**

- make `.viewer-bar` sticky within page scroll
- add mode state text (`截图模式/交互模式`) when item ready
- preserve existing mode toggle behavior

**Step 4: Run target tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm run test -- test/viewer-actionbar.test.ts test/ui-interaction-guardrails.test.ts test/viewer-service.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/views/ViewerView.vue frontend/test/viewer-actionbar.test.ts
git commit -m "test+feat(viewer): add sticky action bar and mode state hint"
```

---

### Task 5: Final verification and integration commit

**Files:**
- Modify: `docs/plans/2026-02-26-ui-interaction-taskflow-implementation-plan.md` (optional status note)

**Step 1: Run required verification**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/frontend
npm run test
npm run build
```

Expected: PASS.

**Step 2: Run repo-level relevant tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
node --test tests/spa-entry-routes.test.js
```

Expected: PASS.

**Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "chore(ui): complete phase-a taskflow interaction improvements"
```

