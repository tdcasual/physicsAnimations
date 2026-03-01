import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin system readOnly guards", () => {
  it("disables wizard form controls when backend reports readOnly mode", () => {
    const steps = read("src/views/admin/system/SystemWizardSteps.vue");
    const connection = read("src/views/admin/system/SystemWizardConnectionStep.vue");

    expect(steps).toMatch(/:read-only-mode="readOnlyMode"/);
    expect(steps).toMatch(/type="radio"[^\\n]*:disabled="readOnlyMode"/);

    expect(connection).toMatch(/readOnlyMode:\s*boolean/);
    expect(connection).toMatch(/class="field-input"[^\\n]*:disabled="readOnlyMode"/);
    expect(connection).toMatch(/type="checkbox"[^\\n]*:disabled="readOnlyMode"/);
  });
});
