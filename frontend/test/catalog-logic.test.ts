import { describe, expect, it } from "vitest";
import { computeCatalogView } from "../src/features/catalog/catalogState";
import type { CatalogData } from "../src/features/catalog/types";

const sampleCatalog: CatalogData = {
  groups: {
    mechanics: {
      id: "mechanics",
      title: "力学",
      order: 10,
      hidden: false,
      categories: {
        kinematics: {
          id: "kinematics",
          groupId: "mechanics",
          title: "运动学",
          order: 10,
          hidden: false,
          items: [
            {
              id: "m-1",
              type: "builtin",
              categoryId: "kinematics",
              title: "速度图像",
              description: "v-t 图像分析",
              href: "animations/m1.html",
              src: "animations/m1.html",
              thumbnail: "",
              order: 1,
            },
          ],
        },
      },
    },
    optics: {
      id: "optics",
      title: "光学",
      order: 20,
      hidden: false,
      categories: {
        reflection: {
          id: "reflection",
          groupId: "optics",
          title: "反射",
          order: 1,
          hidden: false,
          items: [
            {
              id: "o-1",
              type: "link",
              categoryId: "reflection",
              title: "镜面反射",
              description: "光的反射规律",
              href: "https://example.com",
              src: "https://example.com",
              thumbnail: "",
              order: 1,
            },
          ],
        },
      },
    },
  },
};

describe("computeCatalogView", () => {
  it("falls back to highest-order group and all category", () => {
    const view = computeCatalogView({
      catalog: sampleCatalog,
      selectedGroupId: "missing",
      selectedCategoryId: "missing",
      query: "",
    });

    expect(view.activeGroupId).toBe("optics");
    expect(view.activeCategoryId).toBe("all");
    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.id).toBe("o-1");
  });

  it("filters by category and keyword", () => {
    const byCategory = computeCatalogView({
      catalog: sampleCatalog,
      selectedGroupId: "mechanics",
      selectedCategoryId: "kinematics",
      query: "",
    });
    expect(byCategory.items).toHaveLength(1);
    expect(byCategory.items[0]?.id).toBe("m-1");

    const byQuery = computeCatalogView({
      catalog: sampleCatalog,
      selectedGroupId: "mechanics",
      selectedCategoryId: "all",
      query: "图像",
    });
    expect(byQuery.items).toHaveLength(1);
    expect(byQuery.items[0]?.title).toContain("图像");

    const empty = computeCatalogView({
      catalog: sampleCatalog,
      selectedGroupId: "mechanics",
      selectedCategoryId: "all",
      query: "不存在",
    });
    expect(empty.items).toHaveLength(0);
    expect(empty.hasAnyItems).toBe(true);
  });
});
