# Library Unsaved Drafts And UI Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复资源库后台未保存草稿在路由切换与页内上下文切换时被静默覆盖的问题，并继续下一轮 UI 审计。

**Architecture:** 复用现有后台共享的 `usePendingChangesGuard` 处理路由离开与浏览器关闭拦截；在资源库状态层新增统一的脏态计算与“确认放弃草稿”入口，集中拦截文件夹切换、资源编辑切换、Embed 平台编辑切换和面板切换触发的上下文覆盖。继续审计时优先使用真实浏览器复现，再回看代码确认根因。

**Tech Stack:** Vue 3 Composition API、Vue Router、Vitest、Playwright CLI。

---

### Task 1: 补资源库失败回归测试

**Files:**
- Modify: `frontend/test/admin-pending-changes-route-guard.test.ts`
- Create: `frontend/test/admin-library-draft-guard.test.ts`

**Step 1: Write the failing test**
- 为 `library` 增加源码约束测试，覆盖：
  - 资源库状态已接入 `usePendingChangesGuard`
  - 存在统一 `hasPendingChanges` 计算
  - 文件夹切换经过统一 `confirmDiscardPendingChanges`
  - 资源 / Embed 编辑切换经过同一确认入口

**Step 2: Run test to verify it fails**
- Run: `npm --prefix frontend run test -- --run test/admin-library-draft-guard.test.ts test/admin-pending-changes-route-guard.test.ts`
- Expected: FAIL，提示 `library` 尚未接入统一保护

### Task 2: 实现资源库统一草稿保护

**Files:**
- Modify: `frontend/src/features/library/useLibraryAdminState.ts`
- Modify: `frontend/src/features/library/useLibraryAdminActionWiring.ts`
- Modify: `frontend/src/features/library/useLibraryFolderActions.ts`
- Modify: `frontend/src/features/library/useLibraryAssetEditorActions.ts`
- Modify: `frontend/src/features/library/useLibraryEmbedProfileActions.ts`
- Modify: `frontend/src/features/library/useLibraryAdminDataActions.ts`
- Modify: `frontend/src/views/admin/AdminLibraryView.vue`
- Reuse: `frontend/src/features/admin/composables/usePendingChangesGuard.ts`

**Step 1: Add minimal dirty-state computation**
- 在资源库状态层集中计算：
  - 新建文件夹表单
  - 文件夹编辑表单
  - 封面上传待选文件
  - 资源上传表单
  - 资源编辑表单
  - Embed 新建 / 编辑表单

**Step 2: Add shared route-leave guard**
- 调用 `usePendingChangesGuard`，文案对齐后台其他模块

**Step 3: Add shared discard confirm helper**
- 增加统一 `confirmDiscardPendingChanges()`，供：
  - 文件夹切换
  - 资源编辑切换/取消
  - Embed 编辑切换/取消
  - 面板切换（若会导致上下文覆盖）

**Step 4: Prevent silent overwrite on folder switch**
- 让文件夹切换先确认，再允许 `selectedFolderId` 更新与 `syncFolderEditDraft()` 覆盖表单

### Task 3: 绿灯与验证

**Files:**
- Test: `frontend/test/admin-library-draft-guard.test.ts`
- Test: `frontend/test/admin-pending-changes-route-guard.test.ts`
- Test: `frontend/test/admin-draft-preservation.test.ts`

**Step 1: Run targeted tests**
- Run: `npm --prefix frontend run test -- --run test/admin-library-draft-guard.test.ts test/admin-pending-changes-route-guard.test.ts test/admin-draft-preservation.test.ts`

**Step 2: Run broader verification**
- Run: `npm run typecheck:frontend`
- Run: `npm run build:frontend`
- Run: `npm run smoke:spa-admin`

**Step 3: Run browser re-check**
- `/admin/library` 修改文件夹名称后点侧栏“分类”应弹确认
- `/admin/library` 修改文件夹名称后点另一条文件夹应弹确认
- 资源 / Embed 编辑上下文切换不应静默吞草稿

### Task 4: 继续下一轮 UI 审计

**Files:**
- Read: `frontend/src/views/admin/library/AdminLibraryView.vue`
- Read: `frontend/src/views/admin/AdminLayoutView.vue`
- Read: `frontend/src/views/ViewerView.vue`
- Read: `frontend/src/views/CatalogView.vue`

**Step 1: Run Playwright UI sweep**
- 继续真实浏览器巡检后台移动端与公共页关键流

**Step 2: Summarize only stable findings**
- 仅输出可稳定复现且能定位到代码的 bug
