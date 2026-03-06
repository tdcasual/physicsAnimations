import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin visual polish", () => {
  it("adds framed workspace surfaces and nav hover feedback", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/admin-nav-shell::before/);
    expect(source).toMatch(/\.admin-link:hover\s*\{/);
    expect(source).toMatch(/\.admin-context-card\s*\{[\s\S]*position:\s*relative/);
  });

  it("adds motion when the mobile workspace menu opens", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/\.admin-nav-shell\s*\{[\s\S]*transition:/);
    expect(source).toMatch(/\.admin-nav-shell\.is-open\s*\{[\s\S]*animation:/);
  });
});
