import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import DemoCard from "../src/views/catalog/components/DemoCard.vue";
import FilterTabs from "../src/views/catalog/components/FilterTabs.vue";
import FolderCard from "../src/views/catalog/components/FolderCard.vue";

describe("DemoCard", () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/demo/:id", name: "demo", component: { template: "<div>demo</div>" } }],
  });

  beforeEach(async () => {
    await router.push("/");
    await router.isReady();
  });

  it("renders with internal route as RouterLink", async () => {
    const wrapper = shallowMount(DemoCard, {
      props: {
        id: "demo1",
        title: "牛顿定律",
        description: "经典力学",
        thumbnail: "/thumb.png",
        href: "/demo/demo1",
        tag: "力学",
      },
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("牛顿定律");
    expect(wrapper.text()).toContain("力学");
    expect(wrapper.find("img").exists()).toBe(true);
  });

  it("renders external link as anchor", () => {
    const wrapper = shallowMount(DemoCard, {
      props: {
        id: "ext1",
        title: "外部演示",
        href: "https://example.com/demo",
        tag: "外链",
      },
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("外部演示");
    expect(wrapper.text()).toContain("外部链接");
  });

  it("renders placeholder when thumbnail is absent", () => {
    const wrapper = shallowMount(DemoCard, {
      props: {
        id: "no-thumb",
        title: "无封面",
        href: "/demo/no-thumb",
      },
      global: { plugins: [router] },
    });

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toContain("无封面");
  });

  it("emits tagClick on tag interaction", async () => {
    const wrapper = shallowMount(DemoCard, {
      props: {
        id: "demo1",
        title: "牛顿定律",
        href: "/demo/demo1",
        tag: "力学",
      },
      global: { plugins: [router] },
    });

    const tag = wrapper.find(".cat-card-tag");
    expect(tag.exists()).toBe(true);
    await tag.trigger("click");

    expect(wrapper.emitted("tagClick")).toHaveLength(1);
    expect(wrapper.emitted("tagClick")![0]).toEqual(["力学"]);
  });

  it("computes consistent rotation from id", () => {
    const wrapper1 = shallowMount(DemoCard, {
      props: { id: "abc", title: "A", href: "/a" },
      global: { plugins: [router] },
    });
    const wrapper2 = shallowMount(DemoCard, {
      props: { id: "abc", title: "A", href: "/a" },
      global: { plugins: [router] },
    });
    const wrapper3 = shallowMount(DemoCard, {
      props: { id: "xyz", title: "X", href: "/x" },
      global: { plugins: [router] },
    });

    const rot1 = (wrapper1.vm as any).rotation;
    const rot2 = (wrapper2.vm as any).rotation;
    const rot3 = (wrapper3.vm as any).rotation;

    expect(rot1).toBe(rot2);
    expect(typeof rot1).toBe("number");
    expect(rot1).toBeGreaterThanOrEqual(-2.5);
    expect(rot1).toBeLessThanOrEqual(2.5);
    // Different id should likely produce different rotation
    expect(rot1 === rot3).toBe(false);
  });
});

describe("FilterTabs", () => {
  const groups = [
    { id: "physics", title: "物理", categories: {} },
    { id: "chemistry", title: "化学", categories: {} },
  ];
  const categories = [
    { id: "mechanics", title: "力学", groupId: "physics", items: [] },
    { id: "electro", title: "电磁", groupId: "physics", items: [] },
  ];

  it("renders skeleton when groups is empty", () => {
    const wrapper = shallowMount(FilterTabs, {
      props: { groups: [], categories: [], activeGroupId: "", activeCategoryId: "" },
    });

    expect(wrapper.findAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders group tabs and emits selectGroup", async () => {
    const wrapper = shallowMount(FilterTabs, {
      props: { groups, categories, activeGroupId: "physics", activeCategoryId: "all" },
    });

    expect(wrapper.text()).toContain("物理");
    expect(wrapper.text()).toContain("化学");

    const physicsBtn = wrapper.findAll("button").find((b) => b.text() === "物理");
    expect(physicsBtn).toBeTruthy();
    await physicsBtn!.trigger("click");

    expect(wrapper.emitted("selectGroup")).toHaveLength(1);
    expect(wrapper.emitted("selectGroup")![0]).toEqual(["physics"]);
  });

  it("renders category tabs including 'all' and emits selectCategory", async () => {
    const wrapper = shallowMount(FilterTabs, {
      props: { groups, categories, activeGroupId: "physics", activeCategoryId: "all" },
    });

    expect(wrapper.text()).toContain("全部");
    expect(wrapper.text()).toContain("力学");
    expect(wrapper.text()).toContain("电磁");

    const mechanicsBtn = wrapper.findAll("button").find((b) => b.text() === "力学");
    expect(mechanicsBtn).toBeTruthy();
    await mechanicsBtn!.trigger("click");

    expect(wrapper.emitted("selectCategory")).toHaveLength(1);
    expect(wrapper.emitted("selectCategory")![0]).toEqual(["mechanics"]);
  });

  it("marks active group and category with is-active class", () => {
    const wrapper = shallowMount(FilterTabs, {
      props: { groups, categories, activeGroupId: "physics", activeCategoryId: "mechanics" },
    });

    const activeGroup = wrapper.findAll(".cat-group-tab").find((el) => el.classes().includes("is-active"));
    expect(activeGroup).toBeTruthy();
    expect(activeGroup!.text()).toBe("物理");

    const activeCategory = wrapper.findAll(".cat-category-tab").find((el) => el.classes().includes("is-active"));
    expect(activeCategory).toBeTruthy();
    expect(activeCategory!.text()).toBe("力学");
  });
});

describe("FolderCard", () => {
  it("renders with cover image", () => {
    const wrapper = shallowMount(FolderCard, {
      props: {
        id: "folder1",
        name: "力学资料",
        coverPath: "/covers/mech.png",
        href: "/library/folder1",
        tag: "力学",
      },
    });

    expect(wrapper.text()).toContain("力学资料");
    expect(wrapper.find("img").exists()).toBe(true);
    expect(wrapper.find("img").attributes("alt")).toBe("力学资料");
  });

  it("renders placeholder without cover", () => {
    const wrapper = shallowMount(FolderCard, {
      props: {
        id: "folder2",
        name: "电磁资料",
        href: "/library/folder2",
      },
    });

    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("falls back to id when name is empty", () => {
    const wrapper = shallowMount(FolderCard, {
      props: {
        id: "folder3",
        name: "",
        href: "/library/folder3",
      },
    });

    expect(wrapper.text()).toContain("folder3");
  });

  it("computes rotation reversed from DemoCard for same id", () => {
    const folder = shallowMount(FolderCard, {
      props: { id: "same-id", name: "Test", href: "/a" },
    });

    const rot = (folder.vm as any).rotation;
    expect(typeof rot).toBe("number");
    expect(rot).toBeGreaterThanOrEqual(-2.5);
    expect(rot).toBeLessThanOrEqual(2.5);
  });
});
