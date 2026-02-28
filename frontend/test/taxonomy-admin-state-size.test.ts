import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("taxonomy admin maintainability budget", () => {
  it("keeps useTaxonomyAdmin below 420 lines and delegates action handlers", () => {
    const filePath = path.resolve(process.cwd(), "src/features/admin/taxonomy/useTaxonomyAdmin.ts");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n").length;

    expect(lines).toBeLessThan(420);
    expect(source).toMatch(/createTaxonomyAdminActions/);
  });
});
