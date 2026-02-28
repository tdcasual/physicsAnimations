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
  const feedback = read("src/features/library/useLibraryAdminFeedback.ts");
  const embedActions = read("src/features/library/useLibraryEmbedProfileActions.ts");
  const assetSelection = read("src/features/library/useLibraryAssetSelection.ts");
  const assetFilters = read("src/features/library/useLibraryAssetFilters.ts");
  const folderActions = read("src/features/library/useLibraryFolderActions.ts");
  return {
    view,
    template,
    style,
    state,
    feedback,
    embedActions,
    assetSelection,
    assetFilters,
    folderActions,
    combined: `${view}\n${template}\n${style}\n${state}\n${feedback}\n${embedActions}\n${assetSelection}\n${assetFilters}\n${folderActions}`,
  };
}

describe("admin library upload", () => {
  it("accepts both ggb and PhET html files", () => {
    const { template } = readLibrarySources();
    expect(template).toMatch(/accept="\.ggb,\.html,\.htm,\.json,\.zip,application\/vnd\.geogebra\.file,text\/html,application\/json,application\/zip"/);
    expect(template).toMatch(/自动识别（\.ggb \/ PhET HTML）/);
  });

  it("defaults upload mode to embed demo mode", () => {
    const { template, state } = readLibrarySources();
    expect(state).toMatch(/openMode\s*=\s*ref<LibraryOpenMode>\("embed"\)/);
    expect(template).toMatch(/<option value="embed">演示（默认）<\/option>/);
    expect(template).toMatch(/<option value="download">仅下载原文件<\/option>/);
  });

  it("uses taxonomy dropdown for folder category selection", () => {
    const { template, combined } = readLibrarySources();
    expect(combined).toMatch(/listTaxonomy/);
    expect(combined).toMatch(/groupedCategoryOptions/);
    expect(template).toMatch(/<select v-model="folderCategoryId" class="field-input">/);
  });

  it("supports optional cover during folder creation and keeps post-create cover update", () => {
    const { template, combined } = readLibrarySources();
    expect(template).toMatch(/id="library-create-cover-file"/);
    expect(combined).toMatch(/onCreateCoverFileChange/);
    expect(combined).toMatch(/uploadLibraryFolderCover/);
    expect(template).toMatch(/id="library-cover-file"/);
  });

  it("allows resource display name input and rename action", () => {
    const { template, combined } = readLibrarySources();
    expect(combined).toMatch(/assetDisplayName/);
    expect(combined).toMatch(/displayName:\s*assetDisplayName\.value/);
    expect(combined).toMatch(/updateLibraryAsset/);
    expect(template).toMatch(/重命名显示名/);
  });

  it("supports switching existing asset open mode", () => {
    const { template, combined } = readLibrarySources();
    expect(combined).toMatch(/switchAssetOpenMode/);
    expect(combined).toMatch(/openMode:\s*mode/);
    expect(template).toMatch(/设为演示/);
    expect(template).toMatch(/设为仅下载/);
  });

  it("supports custom embed profile upload mode with json options", () => {
    const { template, combined } = readLibrarySources();
    expect(combined).toMatch(/assetParserMode/);
    expect(combined).toMatch(/assetEmbedProfileId/);
    expect(combined).toMatch(/assetEmbedOptionsJson/);
    expect(template).toMatch(/Embed 参数 JSON/);
    expect(combined).toMatch(/embedProfileId:\s*assetParserMode\.value === "profile"/);
    expect(combined).toMatch(/embedOptionsJson:\s*assetParserMode\.value === "profile"/);
  });

  it("supports embed profile management inputs and actions", () => {
    const { template, combined } = readLibrarySources();
    expect(template).toMatch(/Embed 平台管理/);
    expect(combined).toMatch(/createLibraryEmbedProfile/);
    expect(combined).toMatch(/listLibraryEmbedProfiles/);
    expect(combined).toMatch(/deleteLibraryEmbedProfile/);
    expect(combined).toMatch(/syncLibraryEmbedProfile/);
    expect(combined).toMatch(/createEmbedProfileEntry/);
    expect(combined).toMatch(/removeEmbedProfile/);
    expect(combined).toMatch(/syncEmbedProfileEntry/);
    expect(template).toMatch(/手动更新/);
  });

  it("supports secondary edit flows for folder, asset, and embed profile", () => {
    const { combined } = readLibrarySources();
    expect(combined).toMatch(/updateLibraryFolder/);
    expect(combined).toMatch(/updateLibraryEmbedProfile/);
    expect(combined).toMatch(/saveFolderMeta/);
    expect(combined).toMatch(/startEditAsset/);
    expect(combined).toMatch(/saveAssetEdit/);
    expect(combined).toMatch(/startEditEmbedProfile/);
    expect(combined).toMatch(/saveEmbedProfileEdit/);
  });
});
