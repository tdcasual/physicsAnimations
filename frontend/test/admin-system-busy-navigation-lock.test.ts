import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin system busy navigation lock", () => {
  it("blocks wizard step navigation helpers while save/validate/sync is in flight", () => {
    const source = read("src/features/admin/system/useSystemWizard.ts");
    expect(source).toMatch(/const wizardBusy = computed\(\(\) => loading\.value \|\| saving\.value \|\| validating\.value \|\| syncing\.value\)/);
    expect(source).toMatch(/if \(wizardBusy\.value\) return false/);
    expect(source).toMatch(/function nextFromMode\(\) \{[\s\S]*if \(wizardBusy\.value\) return;/);
    expect(source).toMatch(/function nextFromConnection\(\) \{[\s\S]*if \(wizardBusy\.value\) return;/);
  });

  it("disables step switching and back/reconfigure buttons while the wizard is busy", () => {
    const source = read("src/views/admin/system/SystemWizardSteps.vue");
    expect(source).toMatch(/const wizardBusy = computed\(\(\) => props\.loading \|\| props\.saving \|\| props\.validating \|\| props\.syncing\)/);
    expect(source).toMatch(/class="step-button"[\s\S]*:disabled="wizardBusy"/);
    expect(source).toMatch(/<input v-model="modeModel" type="radio" value="local" :disabled="wizardBusy \|\| readOnlyMode" @change="onModeChange" \/>/);
    expect(source).toMatch(/<input v-model="modeModel" type="radio" value="webdav" :disabled="wizardBusy \|\| readOnlyMode" @change="onModeChange" \/>/);
    expect(source).toMatch(/<button[\s\S]*class="btn btn-primary"[\s\S]*:disabled="wizardBusy"[\s\S]*@click="emit\('next-from-mode'\)"[\s\S]*>下一步<\/button>/);
    expect(source).toMatch(/<button[\s\S]*class="btn btn-ghost"[\s\S]*:disabled="wizardBusy"[\s\S]*@click="emit\('go-step', 2\)"[\s\S]*>上一步<\/button>/);
    expect(source).toMatch(/<button[\s\S]*v-if="remoteMode"[\s\S]*class="btn btn-ghost"[\s\S]*:disabled="wizardBusy \|\| readOnlyMode"[\s\S]*@click="emit\('run-validation'\)"/);
    expect(source).toMatch(/<button[\s\S]*class="btn btn-primary"[\s\S]*:disabled="wizardBusy \|\| readOnlyMode"[\s\S]*@click="emit\('save-storage'\)"/);
    expect(source).toMatch(/<button[\s\S]*class="btn btn-ghost"[\s\S]*:disabled="wizardBusy \|\| hasUnsavedChanges"[\s\S]*@click="emit\('go-step', 4\)"[\s\S]*>下一步<\/button>/);
    expect(source).toMatch(/<button[\s\S]*class="btn btn-ghost"[\s\S]*:disabled="wizardBusy"[\s\S]*@click="emit\('go-step', 3\)"[\s\S]*>上一步<\/button>/);
    expect(source).toMatch(/<button[\s\S]*class="btn btn-ghost"[\s\S]*:disabled="wizardBusy"[\s\S]*@click="emit\('go-step', 1\)"[\s\S]*>重新配置<\/button>/);
  });
});
