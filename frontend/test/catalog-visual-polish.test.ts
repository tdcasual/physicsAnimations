import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("catalog visual polish", () => {
  it("keeps the hero section centered while avoiding inflated hard-coded stats", () => {
    const vue = read("src/views/catalog/components/HeroSection.vue");

    expect(vue).toMatch(/text-center/);
    expect(vue).toMatch(/font-serif/);
    expect(vue).toMatch(/itemCount/);
    expect(vue).toMatch(/categoryCount/);
    expect(vue).not.toMatch(/100\+/);
    expect(vue).not.toMatch(/>6</);
    expect(vue).not.toMatch(/免费/);
  });

  it("uses gallery cards with subtle hover effect", () => {
    const vue = read("src/views/catalog/components/DemoCard.vue");

    expect(vue).toMatch(/group-hover:scale-105/);
    expect(vue).toMatch(/transition-transform/);
    expect(vue).toMatch(/font-serif/);
  });

  it("removes the complex hero status band and browse instructions", () => {
    const vue = read("src/views/CatalogView.vue");

    expect(vue).not.toMatch(/catalog-hero-overview/);
    expect(vue).not.toMatch(/heroOverviewCards/);
    expect(vue).not.toMatch(/heroMapItems/);
  });

  it("uses a layered gallery grid with responsive columns", () => {
    const vue = read("src/views/CatalogView.vue");

    expect(vue).toMatch(/grid-cols-2/);
    expect(vue).toMatch(/lg:grid-cols-5/);
  });

  it("provides hover overlay on gallery cards", () => {
    const vue = read("src/views/catalog/components/DemoCard.vue");

    expect(vue).toMatch(/group-hover:bg-black/);
  });

  it("gives mobile filter panel sticky positioning with backdrop blur", () => {
    const vue = read("src/views/CatalogView.vue");

    expect(vue).toMatch(/sticky top-16/);
    expect(vue).toMatch(/z-40/);
    expect(vue).toMatch(/backdrop-blur/);
  });

  it("lets empty catalog states show in the main grid with icon", () => {
    const vue = read("src/views/CatalogView.vue");

    expect(vue).toMatch(/showEmptyState/);
    expect(vue).toMatch(/emptyMessage/);
  });

  it("uses skeleton loading for better perceived performance", () => {
    const vue = read("src/views/CatalogView.vue");

    expect(vue).toMatch(/Skeleton/);
    expect(vue).toMatch(/aspect-\[3\/2\]/);
  });

  it("displays cards with clean gallery style", () => {
    const vue = read("src/views/catalog/components/DemoCard.vue");

    expect(vue).toMatch(/bg-white/);
    // Gallery style - clean edges, no borders
    expect(vue).toMatch(/group-hover:scale-105/);
  });
});
