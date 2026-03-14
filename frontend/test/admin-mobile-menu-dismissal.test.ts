import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin mobile menu dismissal", () => {
  it("supports closing the mobile admin menu with Escape and backdrop click", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/@keydown\.esc\.window/);
    expect(source).toMatch(/admin-nav-backdrop/);
    expect(source).toMatch(/v-if="mobileNavOpen"/);
  });
});
