import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin system step navigation guard", () => {
  it("routes forward step-button navigation through the same guardrails as the primary next actions", () => {
    const wizardSource = read("src/features/admin/system/useSystemWizard.ts");
    const stepsSource = read("src/views/admin/system/SystemWizardSteps.vue");

    expect(wizardSource).toMatch(/function canNavigateToStep\(step: WizardStep\)/);
    expect(wizardSource).toMatch(/if \(step <= wizardStep\.value\) return true/);
    expect(wizardSource).toMatch(/if \(wizardStep\.value === 2 && requiresWebdavUrl\.value && !String\(url\.value \|\| ""\)\.trim\(\)\) \{/);
    expect(wizardSource).toMatch(/if \(wizardStep\.value === 3 && hasStorageUnsavedChanges\.value\) return false/);
    expect(wizardSource).toMatch(/function goStep\(step: WizardStep\) \{/);
    expect(wizardSource).toMatch(/if \(!canNavigateToStep\(step\)\) return/);

    expect(stepsSource).not.toMatch(/@click="emit\('go-step', item.id\)"/);
    expect(stepsSource).toMatch(/@click="emit\('step-click', item.id\)"/);
  });
});
