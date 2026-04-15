import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

function countLocks(source: string, expr: string): number {
  return [...source.matchAll(new RegExp(expr, "g"))].length;
}

describe("admin busy field locking", () => {
  it("locks account form fields while account save is in flight", () => {
    const source = read("src/views/admin/AdminAccountView.vue");
    expect(countLocks(source, ':disabled="saving"')).toBeGreaterThanOrEqual(5);
  });



  it("locks embed updater fields while system settings are still loading", () => {
    const viewSource = read("src/views/admin/AdminSystemView.vue");
    const panelSource = read("src/views/admin/system/SystemEmbedUpdaterPanel.vue");
    expect(viewSource).toMatch(/<SystemEmbedUpdaterPanel[\s\S]*:loading="loading"/);
    expect(panelSource).toMatch(/loading: boolean;/);
    expect(panelSource).toMatch(/<input type="checkbox" :checked="enabled" :disabled="loading \|\| saving" @change="onEnabledChange" \/>/);
    expect(panelSource).toMatch(/:disabled="loading \|\| saving"[\s\S]*@update:model-value="onIntervalInput"/);
    expect(panelSource).toMatch(/<PAButton :disabled="loading \|\| saving \|\| Boolean\(saveHint\)" @click="emit\('save'\)">/);
  });

  it("locks embed updater fields while updater save is in flight", () => {
    const source = read("src/views/admin/system/SystemEmbedUpdaterPanel.vue");
    expect(countLocks(source, ':disabled="loading \|\| saving')).toBeGreaterThanOrEqual(2);
    expect(source).toContain(':disabled="loading || saving || Boolean(saveHint)"');
  });
});
