import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia } from "pinia";
import AdminLayoutView from "../src/views/admin/AdminLayoutView.vue";

const originalTitle = document.title;

describe("AdminLayoutView integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.title = originalTitle;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  async function mountLayout(routePath = "/admin/dashboard") {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/admin/dashboard", name: "admin-dashboard", component: { template: "<div>dashboard</div>" } },
        { path: "/admin/content", name: "admin-content", component: { template: "<div>content</div>" } },
        { path: "/admin/library", name: "admin-library", component: { template: "<div>library</div>" } },
        { path: "/admin/taxonomy", name: "admin-taxonomy", component: { template: "<div>taxonomy</div>" } },
        { path: "/admin/system", name: "admin-system", component: { template: "<div>system</div>" } },
        { path: "/admin/account", name: "admin-account", component: { template: "<div>account</div>" } },
        { path: "/admin/uploads", name: "admin-uploads", component: { template: "<div>uploads</div>" } },
      ],
    });
    await router.push(routePath);
    await router.isReady();

    return mount(AdminLayoutView, {
      global: {
        plugins: [createPinia(), router],
      },
    });
  }

  it("renders admin shell header and navigation", async () => {
    const wrapper = await mountLayout("/admin/dashboard");
    expect(wrapper.find(".admin-layout-view").exists()).toBe(true);
    expect(wrapper.find(".admin-shell").exists()).toBe(true);
  });

  it("applies correct admin group class for dashboard route", async () => {
    const wrapper = await mountLayout("/admin/dashboard");
    const section = wrapper.find("section");
    expect(section.classes()).toContain("admin-layout-view--workspace");
  });

  it("applies correct admin group class for library route", async () => {
    const wrapper = await mountLayout("/admin/library");
    const section = wrapper.find("section");
    expect(section.classes()).toContain("admin-layout-view--library");
  });

  it("sets document title based on current section", async () => {
    await mountLayout("/admin/dashboard");
    expect(document.title).toContain("概览");
    expect(document.title).toContain("管理后台");
  });

  it("toggles mobile nav on trigger click", async () => {
    const wrapper = await mountLayout("/admin/dashboard");
    const trigger = wrapper.find(".admin-mobile-nav-trigger");
    expect(trigger.exists()).toBe(true);

    // Initially closed
    expect((wrapper.vm as any).mobileNavOpen).toBe(false);

    // Open
    await trigger.trigger("click");
    expect((wrapper.vm as any).mobileNavOpen).toBe(true);

    // Close
    await trigger.trigger("click");
    expect((wrapper.vm as any).mobileNavOpen).toBe(false);
  });

  it("closes mobile nav on backdrop click", async () => {
    const wrapper = await mountLayout("/admin/dashboard");
    const trigger = wrapper.find(".admin-mobile-nav-trigger");
    await trigger.trigger("click");
    expect((wrapper.vm as any).mobileNavOpen).toBe(true);

    const backdrop = wrapper.find(".admin-nav-backdrop");
    if (backdrop.exists()) {
      await backdrop.trigger("click");
      expect((wrapper.vm as any).mobileNavOpen).toBe(false);
    }
  });

  it("closes mobile nav when route changes", async () => {
    const wrapper = await mountLayout("/admin/dashboard");
    const trigger = wrapper.find(".admin-mobile-nav-trigger");
    await trigger.trigger("click");
    expect((wrapper.vm as any).mobileNavOpen).toBe(true);

    // Change route
    const router = wrapper.vm.$router;
    await router.push("/admin/content");
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).mobileNavOpen).toBe(false);
  });

  it("computes currentAdminGroup from route", async () => {
    const wrapper = await mountLayout("/admin/dashboard");
    const group = (wrapper.vm as any).currentAdminGroup;
    expect(group.id).toBe("workspace");
  });

  it("computes currentAdminSection from route", async () => {
    const wrapper = await mountLayout("/admin/library");
    const section = (wrapper.vm as any).currentAdminSection;
    expect(section.label).toBe("资源库");
  });

  it("has openMobileNav, closeMobileNav and toggleMobileNav functions", async () => {
    const wrapper = await mountLayout("/admin/dashboard");
    const vm = wrapper.vm as any;

    expect(typeof vm.openMobileNav).toBe("function");
    expect(typeof vm.closeMobileNav).toBe("function");
    expect(typeof vm.toggleMobileNav).toBe("function");

    vm.openMobileNav();
    expect(vm.mobileNavOpen).toBe(true);

    vm.closeMobileNav();
    expect(vm.mobileNavOpen).toBe(false);

    vm.toggleMobileNav();
    expect(vm.mobileNavOpen).toBe(true);

    vm.toggleMobileNav();
    expect(vm.mobileNavOpen).toBe(false);
  });
});
