import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin library upload", () => {
  it("accepts both ggb and PhET html files", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/accept="\.ggb,\.html,\.htm,application\/vnd\.geogebra\.file,text\/html"/);
    expect(source).toMatch(/\.ggb \/ PhET HTML/);
  });

  it("defaults upload mode to opening source page", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/openMode\s*=\s*ref<LibraryOpenMode>\("download"\)/);
    expect(source).toMatch(/<option value="download">打开原文件（默认）<\/option>/);
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
});
