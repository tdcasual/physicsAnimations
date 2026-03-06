import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin system embed updater panel", () => {
  it("wires a dedicated panel and API action for embed auto updates", () => {
    const view = read("src/views/admin/AdminSystemView.vue");
    const panel = read("src/views/admin/system/SystemEmbedUpdaterPanel.vue");
    const state = read("src/features/admin/system/useSystemWizard.ts");
    const actions = read("src/features/admin/system/useSystemWizardActions.ts");
    const api = read("src/features/admin/adminApi.ts");

    expect(view).toMatch(/import\s+SystemEmbedUpdaterPanel/);
    expect(view).toMatch(/<SystemEmbedUpdaterPanel/);
    expect(view).toMatch(/:interval-days="embedUpdaterIntervalDays"/);
    expect(view).toMatch(/@save="saveEmbedUpdater"/);

    expect(panel).toMatch(/Embed 自动更新/);
    expect(panel).toMatch(/更新周期（天）/);
    expect(panel).toMatch(/保存自动更新设置/);

    expect(state).toMatch(/const\s+embedUpdater\s*=\s*ref<SystemEmbedUpdater \| null>\(null\)/);
    expect(state).toMatch(/const\s+embedUpdaterIntervalDays\s*=\s*ref\(20\)/);
    expect(state).toMatch(/const\s+hasEmbedUpdaterUnsavedChanges\s*=\s*computed\(/);
    expect(state).toMatch(/saveEmbedUpdater/);

    expect(actions).toMatch(/updateSystemEmbedUpdater/);
    expect(actions).toMatch(/async function saveEmbedUpdater\(/);

    expect(api).toMatch(/export async function updateSystemEmbedUpdater/);
    expect(api).toMatch(/"\/api\/system\/embed-updater"/);
  });
});
