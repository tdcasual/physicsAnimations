# Library Asset Selection Refactor Design

**Goal:** 将资源选择与批量操作逻辑从 `useLibraryAdminState` 拆分为独立组合式，缩小核心文件体积并提升可维护性。

## Scope
- 抽离状态：`selectedAssetIds`、`assetBatchMoveFolderId`、`assetBatchResult`、`undoAssetIds`
- 抽离计算：`selectedAssetCount`、`hasSelectedAssets`、`hasUndoAssets`、`allFilteredAssetsSelected`
- 抽离行为：选择相关（`clearSelectedAssets`、`isAssetSelected`、`toggleAssetSelection`、`onAssetSelectChange`、`onSelectAllFilteredAssetsChange`）以及批量操作（`runAssetBatchOpenMode`、`runAssetBatchMove`、`runAssetBatchDelete`、`runAssetBatchUndo`、`removeAsset`）
- 保持 UI 接口不变，仅调整内部组织

## Non-Goals
- 不调整资源筛选、排序、分页逻辑
- 不修改 API 行为、权限或错误码
- 不新增测试，仅更新受影响的文件引用

## Proposed Structure
- 新增 `frontend/src/features/library/useLibraryAssetSelection.ts`
- `useLibraryAdminState` 通过依赖注入使用新组合式

## Data Flow
- 新组合式从外部注入 `sortedFilteredFolderAssets` 与 `filteredFolderAssets`，用于全选与选择清理。
- 注入 `selectedFolderId`，用于切换文件夹时重置选择与结果。
- 注入 `savingAsset` 与 `setFeedback`、`getApiErrorCode`，复用现有交互与错误处理。
- 注入 `reloadFolders` 与 `reloadFolderAssets`，批量操作完成后刷新。

## Behavior Details
- `selectedAssetIds` 作为单一选择真值来源。
- 批量操作逐项调用 API，累积 `successIds` 与 `failed`，并生成 `assetBatchResult`。
- `runAssetBatchDelete` 写入 `undoAssetIds`；`runAssetBatchUndo` 按失败项回写。
- `watch(filteredFolderAssets)` 自动清理不可见选中项。
- `watch(selectedFolderId)` 清空 `assetBatchResult`、`undoAssetIds` 与选择列表。

## Testing
- 保持现有前端测试覆盖，若断言引用旧文件路径，改为新组合式路径。
- 复用现有 `frontend` 测试与 `smoke:spa-library-admin`。
