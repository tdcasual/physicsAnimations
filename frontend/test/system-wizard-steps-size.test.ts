import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("system wizard steps maintainability budget", () => {
  it("keeps SystemWizardSteps below 340 lines after step split", () => {
    const filePath = path.resolve(process.cwd(), "src/views/admin/system/SystemWizardSteps.vue");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n").length;
    expect(lines).toBeLessThan(340);
  });
});
