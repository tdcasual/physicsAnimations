import { describe, expect, it } from "vitest";
import SystemWizardSteps from "../src/views/admin/system/SystemWizardSteps.vue";
import { mountVueComponent } from "./helpers/mountVueComponent";

describe("admin system disable reason hints", () => {
  it("renders step-3 disable hints through the steps panel", async () => {
    const mounted = await mountVueComponent(SystemWizardSteps, {
      steps: [
        { id: 1, title: "1. 选择模式", hint: "决定存储架构" },
        { id: 2, title: "2. 连接配置", hint: "填写本地或 WebDAV 信息" },
        { id: 3, title: "3. 校验与保存", hint: "验证连接并保存配置" },
        { id: 4, title: "4. 启用同步", hint: "执行首次同步并检查状态" },
      ],
      wizardStep: 3,
      loading: false,
      mode: "webdav",
      url: "https://dav.example.com",
      basePath: "physicsAnimations",
      username: "",
      password: "",
      timeoutMs: 15000,
      scanRemote: false,
      remoteMode: true,
      readOnlyMode: false,
      validating: false,
      saving: false,
      syncing: false,
      validateText: "",
      validateOk: false,
      hasUnsavedChanges: true,
      saveDisabledHint: "正在保存配置，请稍候。",
      continueDisabledHint: "请先保存配置后再继续下一步。",
      syncHint: "",
      canSyncNow: false,
      getFieldError: () => "",
      clearFieldErrors: () => {},
    });

    const saveHint = mounted.host.querySelector(".save-disabled-hint");
    const continueHint = mounted.host.querySelector(".continue-disabled-hint");

    expect(saveHint?.textContent).toContain("正在保存配置，请稍候。");
    expect(continueHint?.textContent).toContain("请先保存配置后再继续下一步。");

    mounted.cleanup();
  });
});
