import { describe, expect, it } from "vitest";
import * as catalogViewStateModule from "../src/features/catalog/useCatalogViewState";

describe("catalog hero actions", () => {
  it("falls back to the main grid when curated sections are absent", () => {
    const buildHeroActions = (catalogViewStateModule as any).buildCatalogHeroActions;

    expect(typeof buildHeroActions).toBe("function");

    expect(buildHeroActions({ currentItemsCount: 0, libraryHighlightsCount: 0 })).toEqual({
      continueHref: "#catalog-all",
      secondaryHref: "#catalog-all",
      secondaryLabel: "浏览全部内容",
    });
  });

  it("keeps section-specific anchors when current and library sections exist", () => {
    const buildHeroActions = (catalogViewStateModule as any).buildCatalogHeroActions;

    expect(typeof buildHeroActions).toBe("function");

    expect(buildHeroActions({ currentItemsCount: 2, libraryHighlightsCount: 3 })).toEqual({
      continueHref: "#catalog-current",
      secondaryHref: "#catalog-library",
      secondaryLabel: "浏览资源库",
    });
  });
});
