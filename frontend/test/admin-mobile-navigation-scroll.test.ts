import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin mobile navigation scroll", () => {
  it("keeps admin section tabs in a single horizontal row on narrow screens", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)/);
    expect(source).toMatch(/\.admin-nav\s*\{[\s\S]*flex-wrap:\s*nowrap/);
    expect(source).toMatch(/\.admin-nav\s*\{[\s\S]*overflow-x:\s*auto/);
    expect(source).toMatch(/\.admin-link\s*\{[\s\S]*flex:\s*0\s+0\s+auto/);
  });
});
