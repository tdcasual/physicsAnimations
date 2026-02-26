import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin taxonomy action feedback", () => {
  it("provides local action feedback region for right-panel operations", () => {
    const source = read("src/views/admin/AdminTaxonomyView.vue");
    expect(source).toMatch(/const\s+actionFeedback\s*=\s*ref\(""\)/);
    expect(source).toMatch(/class="[^"]*action-feedback/);
    expect(source).toMatch(/actionFeedbackError/);
  });
});
