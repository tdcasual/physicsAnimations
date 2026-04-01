import { beforeEach, describe, expect, it } from "vitest";
import SystemEmbedUpdaterPanel from "../src/views/admin/system/SystemEmbedUpdaterPanel.vue";
import { mountVueComponent } from "./helpers/mountVueComponent";
import {
  mountSystemWizardHarness,
  mockUpdateSystemEmbedUpdater,
  resetSystemWizardApiMocks,
} from "./helpers/systemWizardHarness";

describe("admin system embed updater panel", () => {
  beforeEach(() => {
    resetSystemWizardApiMocks();
  });

  it("wires a dedicated panel and API action for embed auto updates", async () => {
    const harness = await mountSystemWizardHarness();

    expect(harness.wizard.embedUpdater.value?.enabled).toBe(true);
    expect(harness.wizard.embedUpdaterIntervalDays.value).toBe(20);
    expect(harness.wizard.hasEmbedUpdaterUnsavedChanges.value).toBe(false);

    harness.wizard.embedUpdaterIntervalDays.value = 30;
    expect(harness.wizard.hasEmbedUpdaterUnsavedChanges.value).toBe(true);

    await harness.wizard.saveEmbedUpdater();

    expect(mockUpdateSystemEmbedUpdater).toHaveBeenCalledWith({
      enabled: true,
      intervalDays: 30,
    });
    expect(harness.wizard.embedUpdaterSuccessText.value).toBe("自动更新设置已保存。");
    expect(harness.wizard.hasEmbedUpdaterUnsavedChanges.value).toBe(false);

    const panel = await mountVueComponent(SystemEmbedUpdaterPanel, {
      embedUpdater: harness.wizard.embedUpdater.value,
      loading: false,
      enabled: true,
      intervalDays: 30,
      saving: false,
      errorText: "",
      successText: "",
      hasUnsavedChanges: false,
      saveHint: "",
      formatDate: () => "-",
    });

    expect(panel.host.textContent).toContain("Embed 自动更新");
    expect(panel.host.textContent).toContain("更新周期（天）");
    expect(panel.host.textContent).toContain("保存自动更新设置");

    panel.cleanup();
    harness.cleanup();
  });
});
