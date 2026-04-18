import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ContentCreateForm from "../src/views/admin/content/ContentCreateForm.vue";

describe("ContentCreateForm integration", () => {
  const baseProps = {
    groupedCategoryOptions: [
      { value: "mechanics", label: "物理 / 力学" },
      { value: "electro", label: "物理 / 电磁学" },
    ],
    linkCategoryId: "mechanics",
    linkUrl: "",
    linkTitle: "",
    linkDescription: "",
    saving: false,
    createLinkUrlError: "",
  };

  it("renders form fields and submit button", () => {
    const wrapper = mount(ContentCreateForm, { props: baseProps });
    expect(wrapper.text()).toContain("添加网页链接");
    expect(wrapper.text()).toContain("分类");
    expect(wrapper.text()).toContain("链接");
    expect(wrapper.text()).toContain("标题（可选）");
    expect(wrapper.text()).toContain("补充描述（可选）");
    expect(wrapper.text()).toContain("添加");
  });

  it("emits update:linkCategoryId on select change", async () => {
    const wrapper = mount(ContentCreateForm, { props: baseProps });
    const select = wrapper.find("select");
    expect(select.exists()).toBe(true);

    await select.setValue("electro");
    expect(wrapper.emitted("update:linkCategoryId")).toHaveLength(1);
    expect(wrapper.emitted("update:linkCategoryId")![0]).toEqual(["electro"]);
  });

  it("emits update:linkUrl and clear-link-url-error on input", async () => {
    const wrapper = mount(ContentCreateForm, { props: baseProps });
    const urlInput = wrapper.find('input[type="url"]');
    expect(urlInput.exists()).toBe(true);

    await urlInput.setValue("https://example.com");

    expect(wrapper.emitted("update:linkUrl")).toHaveLength(1);
    expect(wrapper.emitted("update:linkUrl")![0]).toEqual(["https://example.com"]);
    expect(wrapper.emitted("clear-link-url-error")).toHaveLength(1);
  });

  it("emits update:linkTitle on title input", async () => {
    const wrapper = mount(ContentCreateForm, { props: baseProps });
    // Find the title input by placeholder or by order
    const inputs = wrapper.findAll('input:not([type="url"])');
    // The first non-url input should be the title field
    expect(inputs.length).toBeGreaterThanOrEqual(1);
    await inputs[0].setValue("示例标题");

    expect(wrapper.emitted("update:linkTitle")).toHaveLength(1);
    expect(wrapper.emitted("update:linkTitle")![0]).toEqual(["示例标题"]);
  });

  it("emits update:linkDescription on description input", async () => {
    const wrapper = mount(ContentCreateForm, { props: baseProps });
    const textarea = wrapper.find("textarea");
    expect(textarea.exists()).toBe(true);

    await textarea.setValue("示例描述");

    expect(wrapper.emitted("update:linkDescription")).toHaveLength(1);
    expect(wrapper.emitted("update:linkDescription")![0]).toEqual(["示例描述"]);
  });

  it("emits submit on button click", async () => {
    const wrapper = mount(ContentCreateForm, { props: baseProps });
    const btn = wrapper.find('button:contains("添加")');
    // Fallback: find button by text content via filter
    const buttons = wrapper.findAll("button");
    const addBtn = buttons.find((b) => b.text().includes("添加"));
    expect(addBtn).toBeTruthy();
    await addBtn!.trigger("click");

    expect(wrapper.emitted("submit")).toHaveLength(1);
  });

  it("disables select when saving", () => {
    const wrapper = mount(ContentCreateForm, {
      props: { ...baseProps, saving: true },
    });
    const select = wrapper.find("select");
    expect(select.attributes("disabled")).toBeDefined();
  });

  it("shows error class on url field when createLinkUrlError is set", () => {
    const wrapper = mount(ContentCreateForm, {
      props: { ...baseProps, createLinkUrlError: "链接格式错误" },
    });
    const urlInput = wrapper.find('input[type="url"]');
    expect(urlInput.classes()).toContain("border-destructive");
  });
});
