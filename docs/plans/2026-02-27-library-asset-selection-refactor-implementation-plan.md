# Library Asset Selection Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把资源选择与批量操作逻辑从 `useLibraryAdminState` 抽离到 `useLibraryAssetSelection`，保持 UI 与行为不变。

**Architecture:** 新增组合式封装选择状态与批量操作，`useLibraryAdminState` 通过依赖注入复用并继续负责数据加载、筛选、排序与面板状态。批量操作后仍由主状态触发刷新。

**Tech Stack:** Vue 3 组合式 API, TypeScript, Vitest.

---

### Task 1: 新增失败测试以锁定新组合式入口

**Files:**
- Modify: `frontend/test/library-admin-layout.test.ts`

**Step 1: Write the failing test**

```ts
function readLibrarySources() {
  // ...existing
  const assetSelection = read("src/features/library/useLibraryAssetSelection.ts");
  return {
    // ...existing
    assetSelection,
    combined: [
      // ...existing
      assetSelection,
    ].join("\n"),
  };
}
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- library-admin-layout.test.ts`

Expected: FAIL with `ENOENT` for missing `useLibraryAssetSelection.ts`.

**Step 3: Commit**

```bash
git add frontend/test/library-admin-layout.test.ts
git commit -m "test: add asset selection source coverage"
```

---

### Task 2: 创建 `useLibraryAssetSelection` 组合式骨架

**Files:**
- Create: `frontend/src/features/library/useLibraryAssetSelection.ts`

**Step 1: Write the failing test**

Use the failing test from Task 1 (no extra test needed).

**Step 2: Write minimal implementation**

```ts
import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { deleteLibraryAsset, restoreLibraryAsset, updateLibraryAsset } from "./libraryApi";
import type { AssetBatchResult } from "./libraryAdminModels";
import type { LibraryAsset, LibraryOpenMode } from "./types";

type BatchFailure = { id: string; reason: string };

type AssetSelectionDeps = {
  savingAsset: Ref<boolean>;
  selectedFolderId: Ref<string>;
  filteredFolderAssets: ComputedRef<LibraryAsset[]>;
  sortedFilteredFolderAssets: ComputedRef<LibraryAsset[]>;
  reloadFolders: () => Promise<void>;
  reloadFolderAssets: () => Promise<void>;
  setFeedback: (message: string, isError?: boolean) => void;
  getApiErrorCode: (err: unknown) => string;
};

export function useLibraryAssetSelection(deps: AssetSelectionDeps) {
  // TODO: move state + computed + functions here
  return {
    // exported state + computed + actions
  };
}
```

**Step 3: Run test to verify it still fails**

Run: `npm --prefix frontend test -- library-admin-layout.test.ts`

Expected: still FAIL (missing exports / combined assertions).

**Step 4: Commit**

```bash
git add frontend/src/features/library/useLibraryAssetSelection.ts
git commit -m "refactor(library-admin): add asset selection composable shell"
```

---

### Task 3: 迁移选择状态与批量操作逻辑到新组合式

**Files:**
- Modify: `frontend/src/features/library/useLibraryAssetSelection.ts`

**Step 1: Write the failing test**

Ensure `library-admin-layout` still fails because expected strings are not found in combined sources.

**Step 2: Write minimal implementation**

Move the following into `useLibraryAssetSelection`:
- State: `selectedAssetIds`, `assetBatchMoveFolderId`, `assetBatchResult`, `undoAssetIds`
- Computed: `selectedAssetCount`, `hasSelectedAssets`, `hasUndoAssets`, `allFilteredAssetsSelected`
- Helpers: `setAssetBatchResult`, `clearSelectedAssets`, `isAssetSelected`, `toggleAssetSelection`, `onAssetSelectChange`, `onSelectAllFilteredAssetsChange`
- Batch actions: `runAssetBatchOpenMode`, `runAssetBatchMove`, `runAssetBatchDelete`, `runAssetBatchUndo`, `removeAsset`
- Watchers: `watch(filteredFolderAssets)` and `watch(selectedFolderId)` to reset selection/result state

Use the injected deps instead of outer variables. Example (partial):

```ts
const selectedAssetIds = ref<string[]>([]);
const assetBatchMoveFolderId = ref("");
const assetBatchResult = ref<AssetBatchResult | null>(null);
const undoAssetIds = ref<string[]>([]);

const selectedAssetCount = computed(() => selectedAssetIds.value.length);
const hasSelectedAssets = computed(() => selectedAssetIds.value.length > 0);
const hasUndoAssets = computed(() => undoAssetIds.value.length > 0);
const allFilteredAssetsSelected = computed(() => {
  if (deps.filteredFolderAssets.value.length === 0) return false;
  const selected = new Set(selectedAssetIds.value);
  return deps.filteredFolderAssets.value.every((asset) => selected.has(asset.id));
});
```

**Step 3: Run test to verify it passes**

Run: `npm --prefix frontend test -- library-admin-layout.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add frontend/src/features/library/useLibraryAssetSelection.ts
git commit -m "refactor(library-admin): move asset selection and batch actions"
```

---

### Task 4: 在 `useLibraryAdminState` 中接入新组合式

**Files:**
- Modify: `frontend/src/features/library/useLibraryAdminState.ts`

**Step 1: Write the failing test**

If needed, temporarily remove old state to see layout test fail for missing batch actions in combined sources.

**Step 2: Write minimal implementation**

- 引入 `useLibraryAssetSelection` 并传入依赖。
- 删除重复 state / computed / actions / watchers。
- `reloadFolderAssets` 中调用新组合式的 `clearSelectedAssets`。
- 保持返回字段命名不变，确保 UI 不受影响。

Example (partial):

```ts
const assetSelection = useLibraryAssetSelection({
  savingAsset,
  selectedFolderId,
  filteredFolderAssets,
  sortedFilteredFolderAssets,
  reloadFolders,
  reloadFolderAssets,
  setFeedback,
  getApiErrorCode,
});

const {
  selectedAssetIds,
  assetBatchMoveFolderId,
  assetBatchResult,
  undoAssetIds,
  selectedAssetCount,
  hasSelectedAssets,
  hasUndoAssets,
  allFilteredAssetsSelected,
  clearSelectedAssets,
  isAssetSelected,
  toggleAssetSelection,
  onAssetSelectChange,
  onSelectAllFilteredAssetsChange,
  runAssetBatchOpenMode,
  runAssetBatchMove,
  runAssetBatchDelete,
  runAssetBatchUndo,
  removeAsset,
} = assetSelection;
```

**Step 3: Run tests**

Run:
- `npm --prefix frontend test -- library-admin-layout.test.ts`
- `npm --prefix frontend test -- library-admin-upload.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add frontend/src/features/library/useLibraryAdminState.ts
git commit -m "refactor(library-admin): wire asset selection composable"
```

---

### Task 5: 更新组合源读取以覆盖新文件

**Files:**
- Modify: `frontend/test/library-admin-layout.test.ts`
- Modify: `frontend/test/library-admin-upload.test.ts`

**Step 1: Write the failing test**

Add `useLibraryAssetSelection.ts` to `combined` in both tests if missing, so tests fail when not included.

**Step 2: Write minimal implementation**

Ensure `readLibrarySources()` includes `assetSelection` in `combined` and adjust any expectations that should now be satisfied via the new file.

**Step 3: Run tests**

Run:
- `npm --prefix frontend test -- library-admin-layout.test.ts`
- `npm --prefix frontend test -- library-admin-upload.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add frontend/test/library-admin-layout.test.ts frontend/test/library-admin-upload.test.ts
git commit -m "test: include asset selection composable in library coverage"
```

---

### Task 6: Final verification

**Files:**
- None

**Step 1: Run targeted tests**

Run:
- `npm --prefix frontend test -- library-admin-layout.test.ts`
- `npm --prefix frontend test -- library-admin-upload.test.ts`

Expected: PASS.

**Step 2: Optional smoke**

Run: `npm run smoke:spa-library-admin`
Expected: PASS.

**Step 3: Commit**

No commit unless new changes occurred.
