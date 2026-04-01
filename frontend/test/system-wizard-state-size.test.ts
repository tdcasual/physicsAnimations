import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("system wizard maintainability budget", () => {
  it("keeps useSystemWizard below 290 lines and delegates async actions", () => {
    const filePath = path.resolve(process.cwd(), "src/features/admin/system/useSystemWizard.ts");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n").length;

    expect(lines).toBeLessThan(290);
    expect(source).toMatch(/createSystemWizardActions/);
  });
});
