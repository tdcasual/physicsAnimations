import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin document title", () => {
  it("updates the browser title to the active admin section instead of keeping the app default", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/function applyAdminDocumentTitle\(\)/);
    expect(source).toMatch(/document\.title = `\$\{currentAdminSection\.value\.label\} - 管理后台`/);
    expect(source).toMatch(/applyAdminDocumentTitle\(\)/);
  });
});
