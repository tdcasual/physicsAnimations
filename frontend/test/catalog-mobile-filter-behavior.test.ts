import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function readFile(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("catalog mobile filter behavior", () => {
  it("adds an explicit mobile filter trigger and stateful panel", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/mobileFiltersOpen/);
    expect(source).toMatch(/class="catalog-mobile-filter-trigger"/);
    expect(source).toMatch(/class="catalog-mobile-filter-panel"/);
    expect(source).toMatch(/筛选导航/);
  });

  it("hides the mobile trigger on wide screens and shows a controlled panel on small screens", () => {
    const css = readFile("src/views/CatalogView.css");

    expect(css).toMatch(/\.catalog-mobile-filter-trigger\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.catalog-mobile-filter-trigger\s*\{[\s\S]*display:\s*inline-flex/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.catalog-mobile-filter-panel\s*\{[\s\S]*display:\s*grid/);
  });
});
