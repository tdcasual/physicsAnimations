import { describe, expect, it } from "vitest";
import * as catalogViewStateModule from "../src/features/catalog/useCatalogViewState";

const teacherWorkflowItems = [
  {
    id: "item-1",
    type: "link",
    categoryId: "mechanics",
    title: "斜抛运动",
    description: "",
    href: "/viewer/item-1",
    src: "/viewer/item-1",
    thumbnail: "",
  },
  {
    id: "item-2",
    type: "upload",
    categoryId: "optics",
    title: "凸透镜",
    description: "",
    href: "/viewer/item-2",
    src: "/viewer/item-2",
    thumbnail: "",
  },
  {
    id: "item-3",
    type: "link",
    categoryId: "waves",
    title: "驻波",
    description: "",
    href: "/viewer/item-3",
    src: "/viewer/item-3",
    thumbnail: "",
  },
];

describe("catalog view-state persistence helpers", () => {
  it("round-trips group, category, and query through persisted storage payloads", () => {
    const serialize = (catalogViewStateModule as any).serializeCatalogViewState;
    const parse = (catalogViewStateModule as any).parseCatalogViewState;

    expect(typeof serialize).toBe("function");
    expect(typeof parse).toBe("function");

    const raw = serialize({
      groupId: "physics",
      categoryId: "mechanics",
      query: "图像",
    });

    expect(parse(raw)).toEqual({
      groupId: "physics",
      categoryId: "mechanics",
      query: "图像",
    });
  });

  it("falls back safely when persisted payloads are malformed or incomplete", () => {
    const parse = (catalogViewStateModule as any).parseCatalogViewState;

    expect(typeof parse).toBe("function");
    expect(parse(null)).toBeNull();
    expect(parse("not-json")).toBeNull();
    expect(parse(JSON.stringify({ groupId: "physics" }))).toEqual({
      groupId: "physics",
      categoryId: "all",
      query: "",
    });
    expect(parse(JSON.stringify({ query: "only-query" }))).toBeNull();
  });

  it("builds recent and favorite quick access lists from persisted ids while pruning stale records", () => {
    const buildQuickAccess = (catalogViewStateModule as any).buildCatalogTeacherQuickAccess;

    expect(typeof buildQuickAccess).toBe("function");

    const result = buildQuickAccess(teacherWorkflowItems, {
      recentEntries: [
        { id: "item-3", lastViewedAt: 300 },
        { id: "missing-item", lastViewedAt: 220 },
        { id: "item-1", lastViewedAt: 120 },
      ],
      favoriteEntries: [
        { id: "missing-item", favoritedAt: 500 },
        { id: "item-2", favoritedAt: 420 },
      ],
      recentLimit: 4,
      favoriteLimit: 4,
    });

    expect(result.recentItems.map((item: { id: string }) => item.id)).toEqual(["item-3", "item-1"]);
    expect(result.favoriteItems.map((item: { id: string }) => item.id)).toEqual(["item-2"]);
    expect(result.prunedRecentEntries.map((entry: { id: string }) => entry.id)).toEqual(["item-3", "item-1"]);
    expect(result.prunedFavoriteEntries.map((entry: { id: string }) => entry.id)).toEqual(["item-2"]);
  });

  it("builds a compact workspace summary from the visible recent and favorite slices", () => {
    const buildSummary = (catalogViewStateModule as any).buildCatalogTeacherWorkspaceSummary;

    expect(typeof buildSummary).toBe("function");

    expect(
      buildSummary({
        recentItems: teacherWorkflowItems.slice(0, 2),
        favoriteItems: teacherWorkflowItems.slice(2, 3),
      }),
    ).toEqual([
      expect.objectContaining({ label: "最近课堂入口", value: "2 个最近演示" }),
      expect.objectContaining({ label: "已固定演示", value: "1 个常用演示" }),
    ]);
  });
});
