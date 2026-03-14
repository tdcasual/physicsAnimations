import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin document title", () => {
  it("updates the browser title to the active admin section instead of keeping the app default", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/function applyAdminDocumentTitle\(\)/);
    expect(source).toMatch(/document\.title = `\$\{currentAdminSection\.value\.label\} - 管理后台`/);
    expect(source).toMatch(/applyAdminDocumentTitle\(\)/);
  });
});
