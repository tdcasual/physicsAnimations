import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";
import ContentListPanel from "../src/views/admin/content/ContentListPanel.vue";

describe("ContentListPanel integration", () => {
  const baseProps = {
    items: [],
    editingId: "",
    loading: false,
    errorText: "",
    total: 0,
    hasMore: false,
    query: "",
    previewHref: (item: { id: string }) => `/preview/${item.id}`,
    saving: false,
  };

  it("renders empty state when no items", () => {
    const wrapper = shallowMount(ContentListPanel, { props: baseProps });
    expect(wrapper.text()).toContain("暂无内容");
  });

  it("renders empty search state when query has no results", () => {
    const wrapper = shallowMount(ContentListPanel, {
      props: { ...baseProps, query: "力学" },
    });
    expect(wrapper.text()).toContain("未找到匹配内容");
  });

  it("renders error text when provided", () => {
    const wrapper = shallowMount(ContentListPanel, {
      props: { ...baseProps, errorText: "加载失败" },
    });
    expect(wrapper.text()).toContain("加载失败");
  });

  it("computes badgeMap with published variant for visible item", () => {
    const items = [
      { id: "i1", title: "A", description: "", hidden: false, published: true, categoryId: "c1", type: "upload" as const, order: 1, updatedAt: "" },
    ];

    const wrapper = shallowMount(ContentListPanel, {
      props: { ...baseProps, items },
    });

    const vm = wrapper.vm as any;
    const map = vm.badgeMap;
    expect(map.get("i1").label).toBe("已发布");
    expect(map.get("i1").variant).toBe("default");
  });

  it("computes badgeMap with hidden variant", () => {
    const items = [
      { id: "i1", title: "A", description: "", hidden: true, published: true, categoryId: "c1", type: "upload" as const, order: 1, updatedAt: "" },
    ];

    const wrapper = shallowMount(ContentListPanel, {
      props: { ...baseProps, items },
    });

    const vm = wrapper.vm as any;
    const map = vm.badgeMap;
    expect(map.get("i1").label).toBe("隐藏");
    expect(map.get("i1").variant).toBe("secondary");
  });

  it("computes badgeMap with draft variant", () => {
    const items = [
      { id: "i1", title: "A", description: "", hidden: false, published: false, categoryId: "c1", type: "upload" as const, order: 1, updatedAt: "" },
    ];

    const wrapper = shallowMount(ContentListPanel, {
      props: { ...baseProps, items },
    });

    const vm = wrapper.vm as any;
    const map = vm.badgeMap;
    expect(map.get("i1").label).toBe("草稿");
    expect(map.get("i1").variant).toBe("outline");
  });
});
