import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog navigation homepage layout", () => {
  it("keeps a light hero with search, a compact overview rail, and primary quick actions", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/class="catalog-hero"/);
    expect(source).toMatch(/class="catalog-hero-overview"/);
    expect(source).toMatch(/class="catalog-overview-card"/);
    expect(source).toMatch(/class="catalog-hero-search"/);
    expect(source).not.toMatch(/class="catalog-hero-status"/);
    expect(source).not.toMatch(/class="catalog-hero-itinerary"/);
    expect(source).toMatch(/继续浏览|浏览资源库/);
  });

  it("introduces a compact quick-access band for common categories and shortcuts", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/class="catalog-quick-access"/);
    expect(source).toMatch(/class="catalog-quick-access-band"/);
    expect(source).toMatch(/class="catalog-quick-access-copy"/);
    expect(source).not.toMatch(/catalog-quick-access"[^>]*>\s*<div class="catalog-section-heading"/);
    expect(source).toMatch(/常用分类|快捷入口/);
  });

  it("splits the homepage into curated content sections before the main grid", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/class="catalog-section"/);
    expect(source).toMatch(/class="catalog-section-badge"/);
    expect(source).toMatch(/推荐演示|资源库精选|当前分类/);
  });
});
