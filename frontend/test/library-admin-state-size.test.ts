import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("library admin state maintainability budget", () => {
  it("keeps useLibraryAdminState below 500 lines", () => {
    const filePath = path.resolve(process.cwd(), "src/features/library/useLibraryAdminState.ts");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n").length;
    expect(lines).toBeLessThan(500);
  });
});
