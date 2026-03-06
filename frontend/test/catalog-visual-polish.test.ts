import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog visual polish", () => {
  it("adds a layered hero surface and interactive card feedback", () => {
    const css = read("src/views/CatalogView.css");

    expect(css).toMatch(/\.catalog-hero::before/);
    expect(css).toMatch(/\.catalog-card:hover\s*\{[\s\S]*transform:\s*translateY\(/);
    expect(css).toMatch(/\.catalog-quick-chip:hover\s*\{[\s\S]*border-color:/);
  });

  it("gives the mobile filter panel explicit motion states", () => {
    const css = read("src/views/CatalogView.css");

    expect(css).toMatch(/\.catalog-mobile-filter-panel\s*\{[\s\S]*transform:/);
    expect(css).toMatch(/\.catalog-mobile-filter-panel\.is-open\s*\{[\s\S]*animation:/);
  });
});
