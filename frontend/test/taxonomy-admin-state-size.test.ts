import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("taxonomy admin maintainability budget", () => {
  it("keeps useTaxonomyAdmin below 330 lines and delegates state/actions/lifecycle", () => {
    const filePath = path.resolve(process.cwd(), "src/features/admin/taxonomy/useTaxonomyAdmin.ts");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n").length;

    expect(lines).toBeLessThan(330);
    expect(source).toMatch(/useTaxonomyAdminDraftState/);
    expect(source).toMatch(/createTaxonomyAdminActions/);
    expect(source).toMatch(/useTaxonomyAdminLifecycle/);
  });
});
