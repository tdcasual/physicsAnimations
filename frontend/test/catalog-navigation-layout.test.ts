import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function readFile(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("catalog navigation homepage layout", () => {
  it("uses a clean hero section with title and subtitle", () => {
    const source = readFile("src/views/catalog/components/HeroSection.vue");

    // Title - Gallery style
    expect(source).toMatch(/演示工坊/);
    expect(source).toMatch(/font-serif/);
  });

  it("moves the search box into the global topbar for cross-route access", () => {
    const appSource = readFile("src/App.vue");

    expect(appSource).toMatch(/type="search"/);
    expect(appSource).toMatch(/useCatalogSearch/);
  });

  it("uses capsule filter tabs for group and category selection", () => {
    const source = [
      readFile("src/views/CatalogView.vue"),
      readFile("src/views/catalog/components/FilterTabs.vue"),
    ].join("\n");

    expect(source).toMatch(/FilterTabs/);
    expect(source).toMatch(/activeGroupId/);
    expect(source).toMatch(/activeCategoryId/);
  });

  it("presents items in a responsive gallery grid", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/grid-cols-2/);
    expect(source).toMatch(/lg:grid-cols-5/);
  });

  it("delegates item presentation to dedicated card components", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/DemoCard/);
    expect(source).toMatch(/FolderCard/);
  });

  it("keeps sticky filter bar for easy access while scrolling", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/sticky top-16/);
    expect(source).toMatch(/z-40/);
  });

  it("provides scroll-reveal animations for gallery items", () => {
    const source = [
      readFile("src/views/CatalogView.vue"),
      readFile("src/lib/gsap.ts"),
    ].join("\n");

    expect(source).toMatch(/gsap/);
    expect(source).toMatch(/ScrollTrigger/);
    expect(source).toMatch(/stagger/);
  });

  it("displays item count in section header", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/totalItems/);
    expect(source).toMatch(/件作品/);
  });
});
