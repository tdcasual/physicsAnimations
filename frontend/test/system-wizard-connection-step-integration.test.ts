import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import SystemWizardConnectionStep from "../src/views/admin/system/SystemWizardConnectionStep.vue";

describe("SystemWizardConnectionStep integration", () => {
  const baseProps = {
    remoteMode: true,
    readOnlyMode: false,
    url: "https://example.com/dav/",
    basePath: "/",
    username: "admin",
    password: "secret",
    timeoutMs: 5000,
    scanRemote: false,
    getFieldError: vi.fn(() => ""),
    clearFieldErrors: vi.fn(),
  };

  it("renders connection form fields", () => {
    const wrapper = shallowMount(SystemWizardConnectionStep, {
      props: baseProps,
    });
    expect(wrapper.text()).toContain("连接配置");
  });

  it("emits update:url when urlModel changes", () => {
    const wrapper = shallowMount(SystemWizardConnectionStep, {
      props: baseProps,
    });

    const vm = wrapper.vm as any;
    vm.urlModel = "https://new.example.com/";
    expect(wrapper.emitted("update:url")).toHaveLength(1);
    expect(wrapper.emitted("update:url")![0]).toEqual(["https://new.example.com/"]);
  });

  it("emits update:timeoutMs with parsed number", () => {
    const wrapper = shallowMount(SystemWizardConnectionStep, {
      props: baseProps,
    });

    const vm = wrapper.vm as any;
    vm.timeoutMsModel = 10000;
    expect(wrapper.emitted("update:timeoutMs")).toHaveLength(1);
    expect(wrapper.emitted("update:timeoutMs")![0]).toEqual([10000]);
  });

  it("emits update:timeoutMs with NaN for empty string", () => {
    const wrapper = shallowMount(SystemWizardConnectionStep, {
      props: baseProps,
    });

    const vm = wrapper.vm as any;
    vm.timeoutMsModel = "";
    const emitted = wrapper.emitted("update:timeoutMs");
    expect(emitted).toHaveLength(1);
    expect(Number.isNaN(emitted![0][0])).toBe(true);
  });

  it("emits update:scanRemote when toggled", () => {
    const wrapper = shallowMount(SystemWizardConnectionStep, {
      props: baseProps,
    });

    const vm = wrapper.vm as any;
    vm.scanRemoteModel = true;
    expect(wrapper.emitted("update:scanRemote")).toHaveLength(1);
    expect(wrapper.emitted("update:scanRemote")![0]).toEqual([true]);
  });

  it("exposes basePathModel and usernameModel", () => {
    const wrapper = shallowMount(SystemWizardConnectionStep, {
      props: baseProps,
    });

    const vm = wrapper.vm as any;
    expect(vm.basePathModel).toBe("/");
    expect(vm.usernameModel).toBe("admin");
  });

  it("parses timeout string via parseTimeoutMsInput", () => {
    const wrapper = shallowMount(SystemWizardConnectionStep, {
      props: baseProps,
    });

    const vm = wrapper.vm as any;
    // Number input passes through
    expect(vm.parseTimeoutMsInput(5000)).toBe(5000);
    // Empty string becomes NaN
    expect(Number.isNaN(vm.parseTimeoutMsInput(""))).toBe(true);
  });
});
