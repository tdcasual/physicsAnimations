import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog theme semantics", () => {
  it("avoids hard-coded light palette in catalog view styles", () => {
    const source = read("src/views/CatalogView.vue");
    const styleBlock = source.split("<style scoped>")[1] ?? "";

    expect(styleBlock).not.toMatch(/#ffffff/i);
    expect(styleBlock).not.toMatch(/#f8fafc/i);
    expect(styleBlock).not.toMatch(/#dbeafe/i);
    expect(styleBlock).not.toMatch(/#d1d5db/i);
    expect(styleBlock).toMatch(/var\(--surface\)/);
    expect(styleBlock).toMatch(/var\(--border\)/);
  });
});
