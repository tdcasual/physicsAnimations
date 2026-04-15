import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin library embed busy field locking", () => {
  it("locks embed create form fields while create/save is in flight", () => {
    const source = read("src/views/admin/library/panels/EmbedProfileCreatePanel.vue");
    // PAInput component handles input fields with disabled state
    expect(source).toMatch(/PAInput/);
    expect(source).toMatch(/v-model="vm\.drafts\.embedProfileName"/);
    expect(source).toMatch(/v-model="vm\.drafts\.embedScriptUrl"/);
    expect(source).toMatch(/v-model="vm\.drafts\.embedDefaultOptionsJson"/);
    expect(source).toMatch(/:disabled="vm\.ui\.savingEmbed"/);
    expect(source).toMatch(/<PAButton :disabled="vm\.ui\.savingEmbed" @click="vm\.actions\.createEmbedProfileEntry">新增 Embed 平台<\/PAButton>/);
  });

  it("locks embed edit form fields while save is in flight", () => {
    const source = read("src/views/admin/library/panels/EmbedProfileEditPanel.vue");
    // PAInput component handles input fields with disabled state
    expect(source).toMatch(/PAInput/);
    expect(source).toMatch(/v-model="vm\.drafts\.embedEditName"/);
    expect(source).toMatch(/v-model="vm\.drafts\.embedEditScriptUrl"/);
    expect(source).toMatch(/v-model="vm\.drafts\.embedEditDefaultOptionsJson"/);
    expect(source).toMatch(/:disabled="vm\.ui\.savingEmbed"/);
    expect(source).toMatch(/<PAButton :disabled="vm\.ui\.savingEmbed" @click="vm\.actions\.saveEmbedProfileEdit">保存平台<\/PAButton>/);
    expect(source).toMatch(/<PAButton variant="ghost" :disabled="vm\.ui\.savingEmbed" @click="vm\.actions\.cancelEmbedProfileEdit">取消<\/PAButton>/);
  });
});
