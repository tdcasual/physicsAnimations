import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("catalog visual polish", () => {
  it("removes the hero section entirely in favor of a sr-only heading", () => {
    const vue = read("src/views/CatalogView.vue");
    const css = read("src/views/CatalogView.css");

    expect(vue).toMatch(/class="sr-only"/);
    expect(vue).not.toMatch(/CatalogHeroSection/);
    expect(vue).not.toMatch(/catalog-hero-mainline/);
    expect(vue).not.toMatch(/catalog-hero-toolbar/);
    expect(vue).not.toMatch(/catalog-hero-overview--summary/);
    expect(vue).not.toMatch(/catalog-overview-card--focus/);
    expect(vue).not.toMatch(/catalog-hero-note/);
    expect(vue).not.toMatch(/catalog-hero-map/);
    expect(css).not.toMatch(/\.catalog-hero-mainline\s*\{/);
    expect(css).not.toMatch(/\.catalog-hero-toolbar\s*\{/);
  });

  it("turns quick access into a denser tool band instead of a roomy section shell", () => {
    const vue = [
      read("src/views/CatalogView.vue"),
      read("src/components/catalog/CatalogQuickAccessBand.vue"),
    ].join("\n");
    const css = read("src/views/CatalogView.css");
    const bandVue = read("src/components/catalog/CatalogQuickAccessBand.vue");

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
    expect(bandVue).toMatch(/\.catalog-quick-access-band\s*\{/);
    expect(bandVue).toMatch(/\.catalog-quick-access-copy\s*\{/);
    expect(bandVue).toMatch(/\.catalog-quick-access-label\s*\{/);
    expect(css).not.toMatch(/\.catalog-quick-access-title\s*\{/);
    expect(css).not.toMatch(/\.catalog-quick-access-note\s*\{/);
  });

  it("removes the hero status band and duplicate browse instructions", () => {
    const vue = read("src/views/CatalogView.vue");

    expect(vue).not.toMatch(/catalog-hero-overview/);
    expect(vue).not.toMatch(/catalog-overview-card/);
    expect(vue).not.toMatch(/heroOverviewCards/);
    expect(vue).not.toMatch(/heroMapItems/);
    expect(vue).not.toMatch(/浏览提示/);
    expect(vue).not.toMatch(/class="catalog-hero-status"/);
    expect(vue).not.toMatch(/catalog-hero-itinerary/);
  });

  it("no longer has a hero section with primary actions", () => {
    const vue = read("src/views/CatalogView.vue");
    const css = read("src/views/CatalogView.css");

    expect(vue).not.toMatch(/catalog-hero-mainline/);
    expect(vue).not.toMatch(/catalog-hero-toolbar/);
    expect(vue).not.toMatch(/catalog-hero-primary/);
    expect(css).not.toMatch(/\.catalog-hero-mainline\s*\{/);
    expect(css).not.toMatch(/\.catalog-hero-toolbar\s*\{/);
  });

  it("adds a layered stage surface and interactive card feedback", () => {
    const css = read("src/views/CatalogView.css");

    expect(css).toMatch(/\.catalog-stage\s*\{[\s\S]*border:/);
    expect(css).toMatch(/\.catalog-card:hover\s*\{[\s\S]*box-shadow:/);
    const bandVue2 = read("src/components/catalog/CatalogQuickAccessBand.vue");
    expect(bandVue2).toMatch(/\.catalog-quick-chip:hover\s*\{[\s\S]*border-color:/);
    expect(css).toMatch(/@keyframes\s+catalog-panel-in/);
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

  it("collapses the teaching workspace behind a compact summary toggle on mobile", () => {
    const area = read("src/components/catalog/CatalogTeacherQuickAccessArea.vue");

    expect(area).toMatch(/mobileWorkbenchOpen/);
    expect(area).toMatch(/catalog-workbench-summary/);
    expect(area).toMatch(/展开教学工作区|收起教学工作区/);
    expect(area).toMatch(/catalog-workbench-disclosure/);
    expect(area).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.catalog-workbench-summary\s*\{[\s\S]*display:\s*grid/);
    expect(area).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.catalog-workbench-disclosure\s*\{[\s\S]*grid-template-rows:\s*0fr/);
    expect(area).toMatch(/\.catalog-workbench-disclosure\.is-open\s*\{[\s\S]*grid-template-rows:\s*1fr/);
  });

  it("promotes browseable content into the desktop stage instead of spending the first screen on support rails alone", () => {
    const view = read("src/views/CatalogView.vue");
    const css = read("src/views/CatalogView.css");
    const area = read("src/components/catalog/CatalogTeacherQuickAccessArea.vue");

    expect(view).toMatch(/stageFeaturedItems/);
    expect(view).toMatch(/catalog-stage-layout/);
    expect(view).toMatch(/catalog-stage-primary/);
    expect(view).toMatch(/catalog-stage-feature/);
    expect(view).toMatch(/catalog-card-strip--stage/);
    expect(css).toMatch(/@media\s*\(min-width:\s*960px\)\s*\{[\s\S]*\.catalog-stage-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s*minmax\(280px,\s*0\.85fr\)/);
    expect(css).toMatch(/@media\s*\(min-width:\s*960px\)\s*\{[\s\S]*\.catalog-card-strip--stage\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(area).toMatch(/@media\s*\(min-width:\s*960px\)\s*\{[\s\S]*\.catalog-teacher-quick-access\s*\{[\s\S]*padding:\s*14px/);
    expect(area).toMatch(/:deep\(\.catalog-teacher-empty\)/);
  });
});
