import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

function readLibrarySources() {
  const view = read("src/views/admin/AdminLibraryView.vue");
  const template = read("src/views/admin/library/AdminLibraryView.template.html");
  const style = read("src/views/admin/library/AdminLibraryView.css");
  const state = read("src/features/library/useLibraryAdminState.ts");
  const dataActions = read("src/features/library/useLibraryAdminDataActions.ts");
  const feedback = read("src/features/library/useLibraryAdminFeedback.ts");
  const embedActions = read("src/features/library/useLibraryEmbedProfileActions.ts");
  const assetSelection = read("src/features/library/useLibraryAssetSelection.ts");
  const assetFilters = read("src/features/library/useLibraryAssetFilters.ts");
  const folderActions = read("src/features/library/useLibraryFolderActions.ts");
  const assetCrudActions = read("src/features/library/useLibraryAssetCrudActions.ts");
  const assetEditorActions = read("src/features/library/useLibraryAssetEditorActions.ts");
  const panelSections = read("src/features/library/useLibraryPanelSections.ts");
  const adminLifecycle = read("src/features/library/useLibraryAdminLifecycle.ts");
  const folderColumn = read("src/views/admin/library/LibraryFolderColumn.vue");
  const assetColumn = read("src/views/admin/library/LibraryAssetColumn.vue");
  const inspectorColumn = read("src/views/admin/library/LibraryInspectorColumn.vue");
  const folderPanel = read("src/views/admin/library/panels/FolderPanel.vue");
  const assetPanel = read("src/views/admin/library/panels/AssetPanel.vue");
  const embedPanel = read("src/views/admin/library/panels/EmbedPanel.vue");
  const operationLogPanel = read("src/views/admin/library/panels/OperationLogPanel.vue");
  return {
    view,
    template,
    style,
    state,
    dataActions,
    feedback,
    embedActions,
    assetSelection,
    assetFilters,
    folderActions,
    assetCrudActions,
    assetEditorActions,
    panelSections,
    adminLifecycle,
    folderColumn,
    assetColumn,
    inspectorColumn,
    folderPanel,
    assetPanel,
    embedPanel,
    operationLogPanel,
    combined: [
      view,
      template,
      style,
      state,
      dataActions,
      feedback,
      embedActions,
      assetSelection,
      assetFilters,
      folderActions,
      assetCrudActions,
      assetEditorActions,
      panelSections,
      adminLifecycle,
      folderColumn,
      assetColumn,
      inspectorColumn,
      folderPanel,
      assetPanel,
      embedPanel,
      operationLogPanel,
    ].join("\n"),
  };
}

describe("admin library layout", () => {
  it("uses a three-column workbench with panel tabs and scoped search", () => {
    const { template, combined } = readLibrarySources();
    expect(template).toMatch(/library-workbench/);
    expect(template).not.toMatch(/library-quick-actions/);
    expect(combined).toMatch(/library-column-left/);
    expect(combined).toMatch(/library-column-middle/);
    expect(combined).toMatch(/library-column-right/);
    expect(template).toMatch(/library-panel-tabs/);
    expect(template).toMatch(/panel-section-toggle/);
    expect(combined).toMatch(/togglePanelSection/);
    expect(template).toMatch(/folder-search-input/);
    expect(template).toMatch(/asset-search-input/);
    expect(template).toMatch(/profile-search-input/);
  });

  it("composes workbench columns via dedicated column components", () => {
    const { view, template, folderColumn, assetColumn, inspectorColumn, folderPanel, assetPanel, embedPanel, operationLogPanel } =
      readLibrarySources();

    expect(view).toMatch(/import LibraryFolderColumn/);
    expect(view).toMatch(/import LibraryAssetColumn/);
    expect(view).toMatch(/import LibraryInspectorColumn/);
    expect(template).toMatch(/<LibraryFolderColumn>/);
    expect(template).toMatch(/<LibraryAssetColumn>/);
    expect(template).toMatch(/<LibraryInspectorColumn>/);
    expect(view).toMatch(/import FolderPanel/);
    expect(view).toMatch(/import AssetPanel/);
    expect(view).toMatch(/import EmbedPanel/);
    expect(view).toMatch(/import OperationLogPanel/);
    expect(template).toMatch(/<FolderPanel/);
    expect(template).toMatch(/<AssetPanel/);
    expect(template).toMatch(/<EmbedPanel/);
    expect(template).toMatch(/<OperationLogPanel>/);

    expect(folderColumn).toMatch(/library-column-left/);
    expect(assetColumn).toMatch(/library-column-middle/);
    expect(inspectorColumn).toMatch(/library-column-right/);
    expect(folderPanel).toMatch(/panel-content/);
    expect(assetPanel).toMatch(/panel-content/);
    expect(embedPanel).toMatch(/panel-content/);
    expect(operationLogPanel).toMatch(/recent-action-log/);
  });

  it("provides batch actions and advanced filters for asset management", () => {
    const { template, combined } = readLibrarySources();
    expect(template).toMatch(/asset-mode-filter/);
    expect(template).toMatch(/asset-profile-filter/);
    expect(template).toMatch(/asset-sort-select/);
    expect(template).toMatch(/asset-list-head/);
    expect(template).toMatch(/asset-batch-toolbar/);
    expect(template).toMatch(/asset-batch-result/);
    expect(combined).toMatch(/runAssetBatchUndo/);
    expect(template).toMatch(/deleted-assets-list/);
    expect(combined).toMatch(/restoreDeletedAsset/);
    expect(combined).toMatch(/removeDeletedAssetPermanently/);
    expect(combined).toMatch(/deleteLibraryAssetPermanently/);
    expect(template).toMatch(/永久删除/);
    expect(combined).toMatch(/不可恢复/);
    expect(combined).toMatch(/recent-action-log/);
    expect(combined).toMatch(/recent-action-item/);
    expect(combined).toMatch(/operationLogs/);
    expect(template).toMatch(/operation-log-filter/);
    expect(combined).toMatch(/clearOperationLogs/);
    expect(combined).toMatch(/filteredOperationLogs/);
    expect(template).toMatch(/asset-select-checkbox/);
    expect(combined).toMatch(/runAssetBatchOpenMode/);
    expect(combined).toMatch(/runAssetBatchDelete/);
    expect(combined).toMatch(/runAssetBatchMove/);
  });

  it("moves batch action implementations into the asset selection composable", () => {
    const { state, assetSelection } = readLibrarySources();
    expect(state).not.toMatch(/async function runAssetBatchDelete/);
    expect(state).not.toMatch(/async function runAssetBatchMove/);
    expect(assetSelection).toMatch(/async function runAssetBatchDelete/);
    expect(assetSelection).toMatch(/async function runAssetBatchMove/);
  });

  it("moves query/filter/sort logic into the asset filters composable", () => {
    const { state, assetFilters } = readLibrarySources();
    expect(state).not.toMatch(/const folderSearchQuery = ref/);
    expect(state).not.toMatch(/const filteredFolderAssets = computed/);
    expect(assetFilters).toMatch(/const folderSearchQuery = ref/);
    expect(assetFilters).toMatch(/const filteredFolderAssets = computed/);
    expect(assetFilters).toMatch(/const sortedFilteredFolderAssets = computed/);
  });

  it("moves folder lifecycle actions into the folder actions composable", () => {
    const { state, folderActions } = readLibrarySources();
    expect(state).not.toMatch(/async function createFolderEntry/);
    expect(state).not.toMatch(/async function saveFolderMeta/);
    expect(state).not.toMatch(/async function uploadCover/);
    expect(state).not.toMatch(/async function removeFolder/);
    expect(folderActions).toMatch(/async function createFolderEntry/);
    expect(folderActions).toMatch(/async function saveFolderMeta/);
    expect(folderActions).toMatch(/async function uploadCover/);
    expect(folderActions).toMatch(/async function removeFolder/);
  });

  it("routes panel switching through setActivePanelTab to keep sections expanded", () => {
    const { state, panelSections } = readLibrarySources();
    expect(state).toMatch(/useLibraryPanelSections/);
    expect(state).not.toMatch(/function setActivePanelTab/);
    expect(panelSections).toMatch(/function setActivePanelTab/);
    const directAssignments = panelSections.match(/activePanelTab\.value\s*=/g) ?? [];
    expect(directAssignments.length).toBe(1);
  });

  it("guards folder asset reload against race conditions and unhandled errors", () => {
    const { state, dataActions } = readLibrarySources();
    expect(state).toMatch(/useLibraryAdminDataActions/);
    expect(dataActions).toMatch(/folderAssetsLoadSeq/);
    expect(dataActions).toMatch(/const requestId = deps\.folderAssetsLoadSeq\.value \+ 1/);
    expect(dataActions).toMatch(/requestId !== deps\.folderAssetsLoadSeq\.value \|\| deps\.selectedFolderId\.value !== folderId/);
    expect(state).toMatch(/void reloadFolderAssets\(\)\.catch\(\(\) => \{\}\)/);
    expect(dataActions).toMatch(/加载文件夹资源失败/);
  });

  it("splits saving state by domain to avoid full-page lock", () => {
    const { state } = readLibrarySources();
    expect(state).toMatch(/const savingFolder = ref\(false\)/);
    expect(state).toMatch(/const savingAsset = ref\(false\)/);
    expect(state).toMatch(/const savingEmbed = ref\(false\)/);
    expect(state).toMatch(/const saving = computed\(\(\) => savingFolder\.value \|\| savingAsset\.value \|\| savingEmbed\.value\)/);
    expect(state).not.toMatch(/saving\.value\s*=/);
  });

  it("renders inline field validation for key library admin forms", () => {
    const { template, state, feedback } = readLibrarySources();
    expect(state).toMatch(/useLibraryAdminFeedback/);
    expect(feedback).toMatch(/const fieldErrors = ref<Record<string, string>>\(\{\}\)/);
    expect(feedback).toMatch(/function setFieldError/);
    expect(feedback).toMatch(/function clearFieldErrors/);
    expect(feedback).toMatch(/function getFieldError/);
    expect(template).toMatch(/field-error-text/);
    expect(template).toMatch(/has-error/);
    expect(template).toMatch(/getFieldError\("createFolderName"\)/);
    expect(template).toMatch(/getFieldError\("uploadAssetFile"\)/);
    expect(template).toMatch(/getFieldError\("uploadAssetEmbedProfile"\)/);
    expect(template).toMatch(/getFieldError\("createEmbedProfileName"\)/);
    expect(template).toMatch(/getFieldError\("createEmbedScriptUrl"\)/);
  });

  it("prevents long names from breaking mobile row layout", () => {
    const { style } = readLibrarySources();
    expect(style).toMatch(/\.folder-pick\s*\{[\s\S]*min-width:\s*0;/);
    expect(style).toMatch(/\.asset-main\s*\{[\s\S]*flex:\s*1;/);
    expect(style).toMatch(/\.asset-main\s*\{[\s\S]*min-width:\s*0;/);
    expect(style).toMatch(/\.folder-name,\s*\.asset-name\s*\{[\s\S]*overflow-wrap:\s*anywhere;/);
    expect(style).toMatch(/\.folder-meta,\s*\.asset-meta,\s*\.selected-folder\s*\{[\s\S]*overflow-wrap:\s*anywhere;/);
  });
});
