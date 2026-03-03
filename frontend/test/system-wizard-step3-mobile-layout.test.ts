import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("system wizard step3 mobile layout", () => {
  it("keeps step3 actions in a single mobile column", () => {
    const source = read("src/views/admin/system/SystemWizardSteps.vue");
    expect(source).toContain("wizard-step3-actions");
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.wizard-step3-actions\s*\{[\s\S]*grid-template-columns:\s*1fr/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.wizard-step3-actions\s*\.btn\s*\{[\s\S]*width:\s*100%/);
  });
});
