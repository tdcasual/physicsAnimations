import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog visual polish", () => {
  it("adds a teaching-atlas map and differentiated card metadata", () => {
    const vue = read("src/views/CatalogView.vue");
    const css = read("src/views/CatalogView.css");

    expect(vue).toMatch(/catalog-hero-map/);
    expect(vue).toMatch(/catalog-map-item/);
    expect(vue).toMatch(/catalog-card-kicker/);
    expect(css).toMatch(/\.catalog-hero-map\s*\{/);
    expect(css).toMatch(/\.catalog-card-kicker\s*\{/);
  });

  it("turns quick access into a denser tool band instead of a roomy section shell", () => {
    const vue = read("src/views/CatalogView.vue");
    const css = read("src/views/CatalogView.css");

    expect(vue).toMatch(/catalog-quick-access-band/);
    expect(vue).toMatch(/catalog-quick-access-copy/);
    expect(css).toMatch(/\.catalog-quick-access-band\s*\{/);
    expect(css).toMatch(/\.catalog-quick-access-copy\s*\{/);
  });

  it("compresses the hero explanation into a single overview rail instead of stacked decks", () => {
    const vue = read("src/views/CatalogView.vue");
    const css = read("src/views/CatalogView.css");

    expect(vue).toMatch(/catalog-hero-overview/);
    expect(vue).toMatch(/catalog-overview-card/);
    expect(vue).not.toMatch(/catalog-hero-status/);
    expect(vue).not.toMatch(/catalog-hero-itinerary/);
    expect(css).toMatch(/\.catalog-hero-overview\s*\{/);
    expect(css).toMatch(/\.catalog-overview-card\s*\{/);
  });

  it("adds a layered hero surface and interactive card feedback", () => {
    const css = read("src/views/CatalogView.css");

    expect(css).toMatch(/\.catalog-hero::before/);
    expect(css).toMatch(/\.catalog-card:hover\s*\{[\s\S]*transform:\s*translateY\(/);
    expect(css).toMatch(/\.catalog-quick-chip:hover\s*\{[\s\S]*border-color:/);
    expect(css).toMatch(/@keyframes\s+catalog-hero-rise/);
    expect(css).toMatch(/\.catalog-hero-copy\s*\{[\s\S]*animation:\s*catalog-hero-rise/);
    expect(css).toMatch(/\.catalog-hero-overview\s*\{[\s\S]*animation:\s*catalog-hero-rise/);
  });

  it("gives the mobile filter panel explicit motion states", () => {
    const css = read("src/views/CatalogView.css");

    expect(css).toMatch(/\.catalog-mobile-filter-panel\s*\{[\s\S]*transform:/);
    expect(css).toMatch(/\.catalog-mobile-filter-panel\.is-open\s*\{[\s\S]*animation:/);
  });
});
