import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin system disable reason hints", () => {
  it("routes step-3 disable hints through split wizard composable and steps panel", () => {
    const view = read("src/views/admin/AdminSystemView.vue");
    const state = read("src/features/admin/system/useSystemWizard.ts");
    const steps = read("src/views/admin/system/SystemWizardSteps.vue");

    expect(view).toMatch(/import\s+\{\s*useSystemWizard\s*\}/);
    expect(view).toMatch(/import\s+SystemWizardSteps/);
    expect(view).toMatch(/const\s+system\s*=\s*useSystemWizard\(/);

    expect(state).toMatch(/const\s+saveDisabledHint\s*=\s*computed\(/);
    expect(state).toMatch(/const\s+continueDisabledHint\s*=\s*computed\(/);

    expect(steps).toMatch(/class="[^"]*save-disabled-hint/);
    expect(steps).toMatch(/class="[^"]*continue-disabled-hint/);
  });
});
