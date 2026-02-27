import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin library layout", () => {
  it("uses a three-column workbench with panel tabs and scoped search", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/library-workbench/);
    expect(source).not.toMatch(/library-quick-actions/);
    expect(source).toMatch(/library-column-left/);
    expect(source).toMatch(/library-column-middle/);
    expect(source).toMatch(/library-column-right/);
    expect(source).toMatch(/library-panel-tabs/);
    expect(source).toMatch(/panel-section-toggle/);
    expect(source).toMatch(/togglePanelSection/);
    expect(source).toMatch(/folder-search-input/);
    expect(source).toMatch(/asset-search-input/);
    expect(source).toMatch(/profile-search-input/);
  });

  it("provides batch actions and advanced filters for asset management", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/asset-mode-filter/);
    expect(source).toMatch(/asset-profile-filter/);
    expect(source).toMatch(/asset-sort-select/);
    expect(source).toMatch(/asset-list-head/);
    expect(source).toMatch(/asset-batch-toolbar/);
    expect(source).toMatch(/asset-batch-result/);
    expect(source).toMatch(/runAssetBatchUndo/);
    expect(source).toMatch(/deleted-assets-list/);
    expect(source).toMatch(/restoreDeletedAsset/);
    expect(source).toMatch(/removeDeletedAssetPermanently/);
    expect(source).toMatch(/deleteLibraryAssetPermanently/);
    expect(source).toMatch(/永久删除/);
    expect(source).toMatch(/不可恢复/);
    expect(source).toMatch(/recent-action-log/);
    expect(source).toMatch(/recent-action-item/);
    expect(source).toMatch(/operationLogs/);
    expect(source).toMatch(/operation-log-filter/);
    expect(source).toMatch(/clearOperationLogs/);
    expect(source).toMatch(/filteredOperationLogs/);
    expect(source).toMatch(/asset-select-checkbox/);
    expect(source).toMatch(/runAssetBatchOpenMode/);
    expect(source).toMatch(/runAssetBatchDelete/);
    expect(source).toMatch(/runAssetBatchMove/);
  });

  it("routes panel switching through setActivePanelTab to keep sections expanded", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/function setActivePanelTab/);
    const directAssignments = source.match(/activePanelTab\.value\s*=/g) ?? [];
    expect(directAssignments.length).toBe(1);
  });

  it("guards folder asset reload against race conditions and unhandled errors", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/folderAssetsLoadSeq/);
    expect(source).toMatch(/const requestId = folderAssetsLoadSeq\.value \+ 1/);
    expect(source).toMatch(/requestId !== folderAssetsLoadSeq\.value \|\| selectedFolderId\.value !== folderId/);
    expect(source).toMatch(/void reloadFolderAssets\(\)\.catch\(\(\) => \{\}\)/);
    expect(source).toMatch(/加载文件夹资源失败/);
  });

  it("splits saving state by domain to avoid full-page lock", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/const savingFolder = ref\(false\)/);
    expect(source).toMatch(/const savingAsset = ref\(false\)/);
    expect(source).toMatch(/const savingEmbed = ref\(false\)/);
    expect(source).toMatch(/const saving = computed\(\(\) => savingFolder\.value \|\| savingAsset\.value \|\| savingEmbed\.value\)/);
    expect(source).not.toMatch(/saving\.value\s*=/);
  });

  it("renders inline field validation for key library admin forms", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/const fieldErrors = ref<Record<string, string>>\(\{\}\)/);
    expect(source).toMatch(/function setFieldError/);
    expect(source).toMatch(/function clearFieldErrors/);
    expect(source).toMatch(/function getFieldError/);
    expect(source).toMatch(/field-error-text/);
    expect(source).toMatch(/has-error/);
    expect(source).toMatch(/getFieldError\("createFolderName"\)/);
    expect(source).toMatch(/getFieldError\("uploadAssetFile"\)/);
    expect(source).toMatch(/getFieldError\("uploadAssetEmbedProfile"\)/);
    expect(source).toMatch(/getFieldError\("createEmbedProfileName"\)/);
    expect(source).toMatch(/getFieldError\("createEmbedScriptUrl"\)/);
  });
});
