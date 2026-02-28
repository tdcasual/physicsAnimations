import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("upload admin maintainability budget", () => {
  it("keeps useUploadAdmin below 300 lines and delegates data actions", () => {
    const filePath = path.resolve(process.cwd(), "src/features/admin/uploads/useUploadAdmin.ts");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n").length;

    expect(lines).toBeLessThan(300);
    expect(source).toMatch(/createUploadAdminActions/);
  });
});
