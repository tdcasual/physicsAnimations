import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin library embed busy field locking", () => {
  it("locks embed create form fields while create/save is in flight", () => {
    const source = read("src/views/admin/library/panels/EmbedProfileCreatePanel.vue");
    expect(source).toMatch(/<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.embedProfileName"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingEmbed"(?:(?!\/>)[\s\S])*\/>/);
    expect(source).toMatch(/<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.embedScriptUrl"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingEmbed"(?:(?!\/>)[\s\S])*\/>/);
    expect(source).toMatch(/<textarea(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.embedDefaultOptionsJson"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingEmbed"(?:(?!\/>)[\s\S])*\/>/);
    expect(source).toMatch(/<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.embedEnabled"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingEmbed"(?:(?!\/>)[\s\S])*\/>/);
    expect(source).toMatch(/<button type="button" class="btn btn-primary" :disabled="vm\.ui\.savingEmbed" @click="vm\.actions\.createEmbedProfileEntry">新增 Embed 平台<\/button>/);
  });

  it("locks embed edit form fields while save is in flight", () => {
    const source = read("src/views/admin/library/panels/EmbedProfileEditPanel.vue");
    expect(source).toMatch(/<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.embedEditName"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingEmbed"(?:(?!\/>)[\s\S])*\/>/);
    expect(source).toMatch(/<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.embedEditScriptUrl"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingEmbed"(?:(?!\/>)[\s\S])*\/>/);
    expect(source).toMatch(/<textarea(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.embedEditDefaultOptionsJson"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingEmbed"(?:(?!\/>)[\s\S])*\/>/);
    expect(source).toMatch(/<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.embedEditEnabled"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingEmbed"(?:(?!\/>)[\s\S])*\/>/);
    expect(source).toMatch(/<button type="button" class="btn btn-primary" :disabled="vm\.ui\.savingEmbed" @click="vm\.actions\.saveEmbedProfileEdit">保存平台<\/button>/);
    expect(source).toMatch(/<button type="button" class="btn btn-ghost" :disabled="vm\.ui\.savingEmbed" @click="vm\.actions\.cancelEmbedProfileEdit">取消<\/button>/);
  });
});
