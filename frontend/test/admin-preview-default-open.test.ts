import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin preview default open", () => {
  it("AdminContentView previews src directly by default", () => {
    const source = read("src/views/admin/AdminContentView.vue");
    expect(source).toMatch(/function previewHref\(item: AdminItem\)/);
    expect(source).toMatch(/normalizePublicUrl\(item\.src \|\| viewerHref\(item\.id\)\)/);
    expect(source).toMatch(/:href="previewHref\(item\)"/);
  });

  it("AdminUploadsView previews src directly by default", () => {
    const source = read("src/views/admin/AdminUploadsView.vue");
    expect(source).toMatch(/function previewHref\(item: AdminItem\)/);
    expect(source).toMatch(/normalizePublicUrl\(item\.src \|\| viewerHref\(item\.id\)\)/);
    expect(source).toMatch(/:href="previewHref\(item\)"/);
  });
});
