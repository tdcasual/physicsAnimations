import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog visual polish", () => {
  it("turns the hero into a denser mainline plus one restrained status strip", () => {
    const vue = [
      read("src/views/CatalogView.vue"),
      read("src/components/catalog/CatalogHeroSection.vue"),
    ].join("\n");
    const css = read("src/views/CatalogView.css");

    expect(vue).toMatch(/catalog-hero-mainline/);
    expect(vue).toMatch(/catalog-hero-toolbar/);
    expect(vue).toMatch(/catalog-search-field--toolbar/);
    expect(vue).toMatch(/catalog-hero-support--status/);
    expect(vue).toMatch(/catalog-hero-status-strip/);
    expect(vue).toMatch(/catalog-hero-status-item--lead/);
    expect(vue).not.toMatch(/catalog-hero-overview--summary/);
    expect(vue).not.toMatch(/catalog-overview-card--focus/);
    expect(vue).not.toMatch(/catalog-hero-note/);
    expect(vue).not.toMatch(/catalog-hero-map/);
    expect(vue).toMatch(/catalog-card-kicker/);
    expect(css).toMatch(/\.catalog-hero-mainline\s*\{/);
    expect(css).toMatch(/\.catalog-hero-toolbar\s*\{/);
    expect(css).toMatch(/\.catalog-search-field--toolbar\s*\{/);
    expect(css).toMatch(/\.catalog-hero-support--status\s*\{/);
    expect(css).toMatch(/\.catalog-hero-status-strip\s*\{/);
    expect(css).toMatch(/\.catalog-hero-status-item--lead\s*\{/);
    expect(css).toMatch(/\.catalog-card-kicker\s*\{/);
  });

  it("turns quick access into a denser tool band instead of a roomy section shell", () => {
    const vue = [
      read("src/views/CatalogView.vue"),
      read("src/components/catalog/CatalogQuickAccessBand.vue"),
    ].join("\n");
    const css = read("src/views/CatalogView.css");

    expect(vue).toMatch(/catalog-stage/);
    expect(vue).toMatch(/catalog-stage-band/);
    expect(vue).toMatch(/catalog-quick-access-band/);
    expect(vue).toMatch(/catalog-quick-access-copy/);
    expect(vue).toMatch(/catalog-quick-access-label/);
    expect(vue).not.toMatch(/catalog-quick-access-title/);
    expect(vue).not.toMatch(/catalog-quick-access-note/);
    expect(vue).not.toMatch(/data-tone="atlas"/);
    expect(css).toMatch(/\.catalog-stage\s*\{/);
    expect(css).toMatch(/\.catalog-stage-band\s*\{/);
    expect(css).toMatch(/\.catalog-quick-access-band\s*\{/);
    expect(css).toMatch(/\.catalog-quick-access-copy\s*\{/);
    expect(css).toMatch(/\.catalog-quick-access-label\s*\{/);
    expect(css).not.toMatch(/\.catalog-quick-access-title\s*\{/);
    expect(css).not.toMatch(/\.catalog-quick-access-note\s*\{/);
  });

  it("compresses the hero explanation into one status band without duplicate browse instructions", () => {
    const vue = [
      read("src/views/CatalogView.vue"),
      read("src/components/catalog/CatalogHeroSection.vue"),
    ].join("\n");
    const css = read("src/views/CatalogView.css");

    expect(vue).toMatch(/catalog-hero-status-strip/);
    expect(vue).toMatch(/catalog-hero-status-item/);
    expect(vue).not.toMatch(/catalog-hero-overview/);
    expect(vue).not.toMatch(/catalog-overview-card/);
    expect(vue).not.toMatch(/heroOverviewCards/);
    expect(vue).not.toMatch(/heroMapItems/);
    expect(vue).not.toMatch(/浏览提示/);
    expect(vue).not.toMatch(/class="catalog-hero-status"/);
    expect(vue).not.toMatch(/catalog-hero-itinerary/);
    expect(css).toMatch(/\.catalog-hero-status-strip\s*\{/);
    expect(css).toMatch(/\.catalog-hero-status-item\s*\{/);
  });

  it("splits the hero into primary actions and lighter supporting guidance", () => {
    const vue = [
      read("src/views/CatalogView.vue"),
      read("src/components/catalog/CatalogHeroSection.vue"),
    ].join("\n");
    const css = read("src/views/CatalogView.css");

    expect(vue).toMatch(/catalog-hero-mainline/);
    expect(vue).toMatch(/catalog-hero-toolbar/);
    expect(vue).not.toMatch(/catalog-hero-primary/);
    expect(vue).toMatch(/catalog-hero-support/);
    expect(css).toMatch(/\.catalog-hero-mainline\s*\{/);
    expect(css).toMatch(/\.catalog-hero-toolbar\s*\{/);
    expect(css).toMatch(/\.catalog-hero-support\s*\{/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.catalog-hero-actions\s*\{[\s\S]*grid-template-columns:/);
  });

  it("adds a layered hero surface and interactive card feedback", () => {
    const css = read("src/views/CatalogView.css");

    expect(css).toMatch(/\.catalog-hero::before/);
    expect(css).toMatch(/\.catalog-card:hover\s*\{[\s\S]*transform:\s*translateY\(/);
    expect(css).toMatch(/\.catalog-quick-chip:hover\s*\{[\s\S]*border-color:/);
    expect(css).toMatch(/@keyframes\s+catalog-hero-rise/);
    expect(css).toMatch(/\.catalog-hero-copy\s*\{[\s\S]*animation:\s*catalog-hero-rise/);
    expect(css).toMatch(/\.catalog-hero-status-strip\s*\{[\s\S]*animation:\s*catalog-hero-rise/);
  });

  it("gives the mobile filter panel explicit motion states", () => {
    const css = read("src/views/CatalogView.css");

    expect(css).toMatch(/\.catalog-mobile-filter-panel\s*\{[\s\S]*transform:/);
    expect(css).toMatch(/\.catalog-mobile-filter-panel\.is-open\s*\{[\s\S]*animation:/);
  });

  it("lets empty catalog states span the full archive grid instead of leaving a narrow card in one column", () => {
    const css = read("src/views/CatalogView.css");

    expect(css).toMatch(/\.catalog-empty\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1/);
    expect(css).toMatch(/\.catalog-empty--inline\s*\{/);
    expect(css).toMatch(/\.catalog-section--flat\s*\{/);
    expect(css).toMatch(/\.catalog-section--flat\s*\{[\s\S]*box-shadow:\s*none/);
    expect(css).toMatch(/\.catalog-section--flat\s*\{[\s\S]*background:\s*transparent/);
    expect(css).toMatch(/\.catalog-section--archive\s*\{[\s\S]*box-shadow:\s*none/);
    expect(css).toMatch(/\.catalog-section--archive\s*\{[\s\S]*background:\s*transparent/);
  });

  it("turns teacher quick access into a denser workspace strip with compact panels", () => {
    const vue = [
      read("src/components/catalog/CatalogTeacherQuickAccessArea.vue"),
      read("src/components/catalog/CatalogTeacherQuickAccessSection.vue"),
      read("src/components/catalog/CatalogTeacherWorkspaceEmptyState.vue"),
      read("src/components/catalog/CatalogTeacherWorkspaceSummary.vue"),
    ].join("\n");

    expect(vue).toMatch(/catalog-workbench/);
    expect(vue).toMatch(/catalog-stage-rail/);
    expect(vue).toMatch(/catalog-workspace-strip/);
    expect(vue).toMatch(/catalog-workspace-item/);
    expect(vue).toMatch(/catalog-workbench-columns/);
    expect(vue).toMatch(/catalog-workbench-column/);
    expect(vue).toMatch(/catalog-teacher-row/);
    expect(vue).toMatch(/catalog-teacher-empty--compact/);
    expect(vue).toMatch(/catalog-teacher-empty--inline/);
    expect(vue).not.toMatch(/catalog-workspace-summary/);
    expect(vue).not.toMatch(/catalog-workspace-pill/);
    expect(vue).not.toMatch(/catalog-workbench-note/);
    expect(vue).not.toMatch(/catalog-workbench-column-note/);
    expect(vue).not.toMatch(/catalog-teacher-panel/);
    expect(vue).not.toMatch(/catalog-workspace-card/);
    expect(vue).not.toMatch(/class="catalog-section catalog-section--teacher"/);
    expect(vue).toMatch(/教学工作区/);
  });
});
