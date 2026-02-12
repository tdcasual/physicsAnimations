import { describe, expect, it } from "vitest";

import {
  buildTaxonomyTree,
  normalizeTaxonomySelection,
  sortCategoryList,
  sortGroupList,
  type TaxonomyCategory,
  type TaxonomyGroup,
  type TaxonomySelection,
} from "../src/features/admin/taxonomyUiState";

const groups: TaxonomyGroup[] = [
  { id: "physics", title: "物理", order: 0, hidden: false, count: 10, categoryCount: 2 },
  { id: "math", title: "数学", order: 5, hidden: true, count: 3, categoryCount: 1 },
];

const categories: TaxonomyCategory[] = [
  { id: "optics", groupId: "physics", title: "光学", order: 9, hidden: false, count: 4 },
  { id: "mechanics", groupId: "physics", title: "力学", order: 1, hidden: true, count: 6 },
  { id: "algebra", groupId: "math", title: "代数", order: 2, hidden: false, count: 3 },
];

describe("taxonomyUiState", () => {
  it("sorters keep descending order then title", () => {
    const sortedGroups = sortGroupList([
      { id: "g1", title: "B", order: 0 },
      { id: "g2", title: "A", order: 0 },
      { id: "g3", title: "C", order: 9 },
    ]);
    expect(sortedGroups.map((group) => group.id)).toEqual(["g3", "g2", "g1"]);

    const sortedCategories = sortCategoryList([
      { id: "c1", groupId: "g", title: "B", order: 0 },
      { id: "c2", groupId: "g", title: "A", order: 0 },
      { id: "c3", groupId: "g", title: "C", order: 9 },
    ]);
    expect(sortedCategories.map((category) => category.id)).toEqual(["c3", "c2", "c1"]);
  });

  it("buildTaxonomyTree hides hidden rows when showHidden=false", () => {
    const tree = buildTaxonomyTree({
      groups,
      categories,
      search: "",
      showHidden: false,
    });

    expect(tree.renderedGroupCount).toBe(1);
    expect(tree.renderedCategoryCount).toBe(1);
    expect(tree.groups[0]?.group.id).toBe("physics");
    expect(tree.groups[0]?.shownCategories.map((category) => category.id)).toEqual(["optics"]);
  });

  it("search by group title keeps all visible categories under that group", () => {
    const tree = buildTaxonomyTree({
      groups,
      categories,
      search: "物理",
      showHidden: true,
    });

    expect(tree.renderedGroupCount).toBe(1);
    expect(tree.groups[0]?.group.id).toBe("physics");
    expect(tree.groups[0]?.shownCategories.map((category) => category.id)).toEqual(["optics", "mechanics"]);
  });

  it("search by category title includes only matched categories for non-matching groups", () => {
    const tree = buildTaxonomyTree({
      groups,
      categories,
      search: "代数",
      showHidden: true,
    });

    expect(tree.renderedGroupCount).toBe(1);
    expect(tree.groups[0]?.group.id).toBe("math");
    expect(tree.groups[0]?.shownCategories.map((category) => category.id)).toEqual(["algebra"]);
  });

  it("normalize selection falls back to first visible group", () => {
    const selection = normalizeTaxonomySelection({
      selection: { kind: "category", id: "missing" } as TaxonomySelection,
      groups,
      categories,
      showHidden: false,
      fallbackGroupId: "physics",
    });
    expect(selection).toEqual({ kind: "group", id: "physics" });
  });
});
