import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog navigation homepage layout", () => {
  it("replaces the hero with a sr-only heading and keeps the stage container clean", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/class="sr-only"/);
    expect(source).toMatch(/class="catalog-stage"/);
    expect(source).not.toMatch(/class="catalog-hero"/);
    expect(source).not.toMatch(/class="catalog-hero-mainline"/);
    expect(source).not.toMatch(/class="catalog-hero-primary"/);
    expect(source).not.toMatch(/catalog-hero-overview/);
    expect(source).not.toMatch(/catalog-overview-card/);
    expect(source).not.toMatch(/catalog-hero-note/);
    expect(source).not.toMatch(/catalog-hero-map/);
    expect(source).not.toMatch(/class="catalog-hero-status"/);
    expect(source).not.toMatch(/class="catalog-hero-itinerary"/);
    expect(source).not.toMatch(/CatalogHeroSection/);
  });

  it("moves the search box into the global topbar for cross-route access", () => {
    const appSource = readFile("src/App.vue");

    expect(appSource).toMatch(/class="topbar-search"/);
    expect(appSource).toMatch(/topbar-search-field/);
    expect(appSource).toMatch(/onTopbarSearch/);
  });

  it("no longer inlines heroStatusItems in the catalog view", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).not.toMatch(/const heroStatusItems = computed/);
    expect(source).not.toMatch(/heroOverviewCards/);
    expect(source).not.toMatch(/label:\s*"当前聚焦"/);
    expect(source).not.toMatch(/label:\s*"下一步"/);
    expect(source).not.toMatch(/label:\s*"当前范围"/);
    expect(source).not.toMatch(/label:\s*"优先入口"/);
    expect(source).not.toMatch(/label:\s*"资源补充"/);
  });

  it("introduces a compact quick-access band for common categories and shortcuts", () => {
    const source = [
      readFile("src/views/CatalogView.vue"),
      readFile("src/components/catalog/CatalogQuickAccessBand.vue"),
    ].join("\n");

    expect(source).toMatch(/class="catalog-stage"/);
    expect(source).toMatch(/class="catalog-quick-access"/);
    expect(source).toMatch(/catalog-stage-band/);
    expect(source).toMatch(/class="catalog-quick-access-band"/);
    expect(source).toMatch(/class="catalog-quick-access-copy"/);
    expect(source).toMatch(/catalog-quick-access-label/);
    expect(source).not.toMatch(/catalog-quick-access-title/);
    expect(source).not.toMatch(/catalog-quick-access-note/);
    expect(source).not.toMatch(/catalog-quick-access"[^>]*>\s*<div class="catalog-section-heading"/);
    expect(source).not.toMatch(/data-tone="atlas"/);
    expect(source).toMatch(/常用分类|快捷入口/);
  });

  it("splits the homepage into curated content sections before the main grid", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/class="catalog-section"/);
    expect(source).toMatch(/catalog-section--flat/);
    expect(source).toMatch(/catalog-section--archive/);
    expect(source).toMatch(/catalog-empty--inline/);
    expect(source).toMatch(/推荐演示|资源库精选|当前分类/);
  });

  it("delegates quick-access presentation to a dedicated page component", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/import CatalogQuickAccessBand/);
    expect(source).toMatch(/<CatalogQuickAccessBand/);
    expect(source).not.toMatch(/class="catalog-quick-access"/);
  });

  it("keeps teacher workspace summary inside the extracted quick-access component instead of inlining it in the route view", () => {
    const view = readFile("src/views/CatalogView.vue");
    const quickAccess = [
      readFile("src/components/catalog/CatalogTeacherQuickAccessArea.vue"),
      readFile("src/components/catalog/CatalogTeacherWorkspaceSummary.vue"),
    ].join("\n");

    expect(view).not.toMatch(/catalog-workbench/);
    expect(quickAccess).toMatch(/catalog-workbench/);
    expect(quickAccess).toMatch(/catalog-stage-rail/);
    expect(quickAccess).toMatch(/catalog-workspace-strip/);
    expect(quickAccess).not.toMatch(/catalog-workbench-note/);
    expect(quickAccess).not.toMatch(/catalog-workbench-column-note/);
    expect(quickAccess).toMatch(/教学工作区/);
  });
});
