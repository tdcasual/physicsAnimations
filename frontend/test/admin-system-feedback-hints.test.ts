import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin system disable reason hints", () => {
  it("exposes save/continue disabled hints in step 3", () => {
    const source = read("src/views/admin/AdminSystemView.vue");
    expect(source).toMatch(/const\s+saveDisabledHint\s*=\s*computed\(/);
    expect(source).toMatch(/const\s+continueDisabledHint\s*=\s*computed\(/);
    expect(source).toMatch(/class="save-disabled-hint"/);
    expect(source).toMatch(/class="continue-disabled-hint"/);
  });
});
