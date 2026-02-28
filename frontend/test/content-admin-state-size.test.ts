import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("content admin maintainability budget", () => {
  it("keeps useContentAdmin below 250 lines and delegates data actions", () => {
    const filePath = path.resolve(process.cwd(), "src/features/admin/content/useContentAdmin.ts");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n").length;

    expect(lines).toBeLessThan(250);
    expect(source).toMatch(/createContentAdminActions/);
  });
});
