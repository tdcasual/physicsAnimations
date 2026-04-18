import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import HeroSection from "../src/views/catalog/components/HeroSection.vue";

vi.mock("../src/views/catalog/components/useHeroAnimations", () => ({
  useHeroAnimations: vi.fn(),
}));

describe("HeroSection integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders title and search input", () => {
    const wrapper = mount(HeroSection, {
      props: { itemCount: 10, categoryCount: 3, categories: [] },
      global: { plugins: [createPinia()] },
    });

    expect(wrapper.text()).toContain("演示工坊");
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
  });

  it("computes stats with plural labels when counts are high", () => {
    const wrapper = mount(HeroSection, {
      props: { itemCount: 10, categoryCount: 3, categories: [] },
      global: { plugins: [createPinia()] },
    });

    const stats = (wrapper.vm as any).stats;
    expect(stats[0].value).toBe("10");
    expect(stats[0].label).toBe("演示");
    expect(stats[1].value).toBe("3");
    expect(stats[1].label).toBe("分类");
    expect(stats[2].value).toBe("在线");
    expect(stats[2].label).toBe("访问");
  });

  it("computes stats with fallback labels when counts are low", () => {
    const wrapper = mount(HeroSection, {
      props: { itemCount: 0, categoryCount: 1, categories: [] },
      global: { plugins: [createPinia()] },
    });

    const stats = (wrapper.vm as any).stats;
    expect(stats[0].value).toBe("持续");
    expect(stats[0].label).toBe("更新");
    expect(stats[1].value).toBe("精选");
    expect(stats[1].label).toBe("内容");
  });

  it("filters hot categories to non-hidden and limits to 5", () => {
    const wrapper = mount(HeroSection, {
      props: {
        itemCount: 10,
        categoryCount: 6,
        categories: [
          { id: "c1", title: "力学", groupId: "g1", hidden: false, items: [] },
          { id: "c2", title: "电磁学", groupId: "g1", hidden: false, items: [] },
          { id: "c3", title: "热学", groupId: "g1", hidden: true, items: [] },
          { id: "c4", title: "光学", groupId: "g1", hidden: false, items: [] },
          { id: "c5", title: "声学", groupId: "g1", hidden: false, items: [] },
          { id: "c6", title: "原子", groupId: "g1", hidden: false, items: [] },
          { id: "c7", title: "量子", groupId: "g1", hidden: false, items: [] },
        ],
      },
      global: { plugins: [createPinia()] },
    });

    const hot = (wrapper.vm as any).hotCategories;
    expect(hot).toHaveLength(5);
    expect(hot.some((c: any) => c.id === "c3")).toBe(false);
  });

  it("emits select-category on tag click", async () => {
    const wrapper = mount(HeroSection, {
      props: {
        itemCount: 10,
        categoryCount: 3,
        categories: [{ id: "c1", title: "力学", groupId: "g1", hidden: false, items: [] }],
      },
      global: { plugins: [createPinia()] },
    });

    (wrapper.vm as any).onTagClick("c1");
    expect(wrapper.emitted("select-category")).toHaveLength(1);
    expect(wrapper.emitted("select-category")![0]).toEqual(["c1"]);
  });

  it("handles missing categories gracefully", () => {
    const wrapper = mount(HeroSection, {
      props: { itemCount: 0, categoryCount: 0 },
      global: { plugins: [createPinia()] },
    });

    expect((wrapper.vm as any).hotCategories).toEqual([]);
  });
});
