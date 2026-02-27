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
    expect(source).toMatch(/打开原文件/);
    expect(source).toMatch(/target="_blank"/);
    expect(source).toMatch(/asset\.displayName\s*\|\|\s*asset\.fileName/);
  });
});
