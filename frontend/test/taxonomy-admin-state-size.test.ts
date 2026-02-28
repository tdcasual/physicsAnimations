import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("taxonomy admin maintainability budget", () => {
  it("keeps useTaxonomyAdmin below 360 lines and delegates state/actions", () => {
    const filePath = path.resolve(process.cwd(), "src/features/admin/taxonomy/useTaxonomyAdmin.ts");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n").length;

    expect(lines).toBeLessThan(360);
    expect(source).toMatch(/useTaxonomyAdminDraftState/);
    expect(source).toMatch(/createTaxonomyAdminActions/);
  });
});
