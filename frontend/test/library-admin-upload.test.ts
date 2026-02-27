import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin library upload", () => {
  it("accepts both ggb and PhET html files", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/accept="\.ggb,\.html,\.htm,\.json,\.zip,application\/vnd\.geogebra\.file,text\/html,application\/json,application\/zip"/);
    expect(source).toMatch(/自动识别（\.ggb \/ PhET HTML）/);
  });

  it("defaults upload mode to embed demo mode", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/openMode\s*=\s*ref<LibraryOpenMode>\("embed"\)/);
    expect(source).toMatch(/<option value="embed">演示（默认）<\/option>/);
    expect(source).toMatch(/<option value="download">仅下载原文件<\/option>/);
  });

  it("uses taxonomy dropdown for folder category selection", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/listTaxonomy/);
    expect(source).toMatch(/groupedCategoryOptions/);
    expect(source).toMatch(/<select v-model="folderCategoryId" class="field-input">/);
  });

  it("supports optional cover during folder creation and keeps post-create cover update", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/id="library-create-cover-file"/);
    expect(source).toMatch(/onCreateCoverFileChange/);
    expect(source).toMatch(/uploadLibraryFolderCover/);
    expect(source).toMatch(/id="library-cover-file"/);
  });

  it("allows resource display name input and rename action", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/assetDisplayName/);
    expect(source).toMatch(/displayName:\s*assetDisplayName\.value/);
    expect(source).toMatch(/updateLibraryAsset/);
    expect(source).toMatch(/重命名显示名/);
  });

  it("supports switching existing asset open mode", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/switchAssetOpenMode/);
    expect(source).toMatch(/openMode:\s*mode/);
    expect(source).toMatch(/设为演示/);
    expect(source).toMatch(/设为仅下载/);
  });

  it("supports custom embed profile upload mode with json options", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/assetParserMode/);
    expect(source).toMatch(/assetEmbedProfileId/);
    expect(source).toMatch(/assetEmbedOptionsJson/);
    expect(source).toMatch(/Embed 参数 JSON/);
    expect(source).toMatch(/embedProfileId:\s*assetParserMode\.value === "profile"/);
    expect(source).toMatch(/embedOptionsJson:\s*assetParserMode\.value === "profile"/);
  });

  it("supports embed profile management inputs and actions", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/Embed 平台管理/);
    expect(source).toMatch(/createLibraryEmbedProfile/);
    expect(source).toMatch(/listLibraryEmbedProfiles/);
    expect(source).toMatch(/deleteLibraryEmbedProfile/);
    expect(source).toMatch(/syncLibraryEmbedProfile/);
    expect(source).toMatch(/createEmbedProfileEntry/);
    expect(source).toMatch(/removeEmbedProfile/);
    expect(source).toMatch(/syncEmbedProfileEntry/);
    expect(source).toMatch(/手动更新/);
  });

  it("supports secondary edit flows for folder, asset, and embed profile", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/updateLibraryFolder/);
    expect(source).toMatch(/updateLibraryEmbedProfile/);
    expect(source).toMatch(/saveFolderMeta/);
    expect(source).toMatch(/startEditAsset/);
    expect(source).toMatch(/saveAssetEdit/);
    expect(source).toMatch(/startEditEmbedProfile/);
    expect(source).toMatch(/saveEmbedProfileEdit/);
  });
});
