import { createApp } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import * as catalogViewStateModule from "../src/features/catalog/useCatalogViewState";
import CatalogTeacherQuickAccessArea from "../src/components/catalog/CatalogTeacherQuickAccessArea.vue";
import { mountVueComponent } from "./helpers/mountVueComponent";

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

  it("adds teacher quick-access sections for recent and favorite demos near the top of the catalog", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const app = createApp(CatalogTeacherQuickAccessArea, {
      recentItems: [],
      favoriteItems: [],
      favoriteIds: new Set<string>(),
    });

    app.mount(root);

    expect(root.querySelector("#catalog-recent")).not.toBeNull();
    expect(root.querySelector("#catalog-favorites")).not.toBeNull();
    expect(root.textContent).toContain("最近查看");
    expect(root.textContent).toContain("收藏演示");

    app.unmount();
    root.remove();
  });

  it("adds a teaching workspace summary with current-class momentum and pinned-demo status", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/viewer/:id", component: { template: "<div />" } },
      ],
    });
    await router.push("/");
    await router.isReady();

    const mounted = await mountVueComponent(
      CatalogTeacherQuickAccessArea,
      {
      recentItems: sampleItems.slice(0, 2),
      favoriteItems: sampleItems.slice(2, 3),
      favoriteIds: new Set<string>(["item-3"]),
      },
      { plugins: [router] },
    );

    expect(mounted.host.textContent).toContain("教学工作区");
    expect(mounted.host.textContent).toContain("最近查看");
    expect(mounted.host.textContent).toContain("已收藏");
    expect(mounted.host.textContent).not.toContain("最近入口与固定演示。");
    expect(mounted.host.textContent).not.toContain("课前回放与课中重开。");
    expect(mounted.host.textContent).not.toContain("把常用演示固定在这里。");
    expect(mounted.host.querySelector(".catalog-workbench")).not.toBeNull();
    expect(mounted.host.querySelector(".catalog-stage-rail")).not.toBeNull();
    expect(mounted.host.querySelector(".catalog-workbench-columns")).not.toBeNull();
    expect(mounted.host.querySelector(".catalog-workbench-column")).not.toBeNull();
    expect(mounted.host.querySelector(".catalog-workspace-pill")).toBeNull();

    mounted.cleanup();
  });
});
