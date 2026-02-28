import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin mobile input safeguards", () => {
  it("disables auto-correct and auto-capitalization for link url input", () => {
    const source = read("src/views/admin/content/ContentCreateForm.vue");
    expect(source).toMatch(/type="url"/);
    expect(source).toMatch(/autocapitalize="none"/);
    expect(source).toMatch(/autocorrect="off"/);
    expect(source).toMatch(/spellcheck="false"/);
  });
});
