import { describe, expect, it } from "vitest";
import { filterFoldersByCatalogContext } from "../src/features/catalog/catalogState";

interface FolderFixture {
  id: string;
  name: string;
  categoryId: string;
}

describe("filterFoldersByCatalogContext", () => {
  const folders: FolderFixture[] = [
    { id: "f-mechanics", name: "运动学资源", categoryId: "kinematics" },
    { id: "f-optics", name: "光学资源", categoryId: "reflection" },
  ];

  it("keeps folders scoped to active group categories when category is all", () => {
    const filtered = filterFoldersByCatalogContext({
      folders,
      activeCategoryId: "all",
      activeGroupCategoryIds: new Set(["kinematics"]),
      query: "",
    });

    expect(filtered.map((folder) => folder.id)).toEqual(["f-mechanics"]);
  });

  it("does not leak folders from other groups even if query matches", () => {
    const filtered = filterFoldersByCatalogContext({
      folders,
      activeCategoryId: "all",
      activeGroupCategoryIds: new Set(["kinematics"]),
      query: "光学",
    });

    expect(filtered).toHaveLength(0);
  });
});
