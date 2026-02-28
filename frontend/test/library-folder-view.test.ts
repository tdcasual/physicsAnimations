import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("library folder view", () => {
  it("contains embed/open-source action rendering", () => {
    const source = read("src/views/LibraryFolderView.vue");
    expect(source).toMatch(/openMode\s*===\s*'embed'/);
    expect(source).toMatch(/打开演示/);
    expect(source).toMatch(/打开文件/);
    expect(source).toMatch(/仅下载/);
    expect(source).toMatch(/target="_blank"/);
    expect(source).toMatch(/asset\.displayName\s*\|\|\s*asset\.fileName/);
  });

  it("loads folder detail before requesting assets to avoid duplicate 404 noise", () => {
    const source = read("src/views/LibraryFolderView.vue");
    expect(source).toMatch(/const nextFolder = await getLibraryFolder\(folderId\)/);
    expect(source).toMatch(/const nextAssets = await listLibraryFolderAssets\(folderId\)/);
    expect(source).not.toMatch(/Promise\.all\(\s*\[\s*getLibraryFolder\(folderId\)\s*,\s*listLibraryFolderAssets\(folderId\)\s*\]/);
  });

  it("ignores stale reload responses after route changes", () => {
    const source = read("src/views/LibraryFolderView.vue");
    expect(source).toMatch(/const reloadSeq = ref\(0\)/);
    expect(source).toMatch(/const requestSeq = reloadSeq\.value \+ 1/);
    expect(source).toMatch(/reloadSeq\.value = requestSeq/);
    expect(source).toMatch(/if \(requestSeq !== reloadSeq\.value \|\| routeFolderId\(\) !== folderId\) return/);
  });
});
