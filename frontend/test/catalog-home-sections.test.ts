import { describe, expect, it } from "vitest";
import * as catalogViewStateModule from "../src/features/catalog/useCatalogViewState";

const sampleItems = Array.from({ length: 6 }, (_, index) => ({
  id: `item-${index + 1}`,
  type: "link",
  categoryId: "mechanics",
  title: `Item ${index + 1}`,
  description: `Description ${index + 1}`,
  href: `/viewer/item-${index + 1}`,
  src: `/viewer/item-${index + 1}`,
  thumbnail: "",
  order: index + 1,
}));

describe("catalog homepage section helper", () => {
  it("splits current and recommended sections into non-overlapping item slices", () => {
    const buildSections = (catalogViewStateModule as any).buildCatalogHomepageSections;

    expect(typeof buildSections).toBe("function");

    const result = buildSections(sampleItems, {
      currentLimit: 4,
      recommendedLimit: 4,
    });

    expect(result.currentItems.map((item: { id: string }) => item.id)).toEqual([
      "item-1",
      "item-2",
      "item-3",
      "item-4",
    ]);
    expect(result.recommendedItems.map((item: { id: string }) => item.id)).toEqual([
      "item-5",
      "item-6",
    ]);
    expect(result.recommendedItems.some((item: { id: string }) => result.currentItems.some((current: { id: string }) => current.id === item.id))).toBe(false);
  });

  it("collapses the recommended section when there is no distinct follow-up slice", () => {
    const buildSections = (catalogViewStateModule as any).buildCatalogHomepageSections;

    expect(typeof buildSections).toBe("function");

    const result = buildSections(sampleItems.slice(0, 3), {
      currentLimit: 4,
      recommendedLimit: 4,
    });

    expect(result.currentItems).toHaveLength(3);
    expect(result.recommendedItems).toEqual([]);
  });
});
