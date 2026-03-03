import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin mobile nav active link visibility", () => {
  it("auto-scrolls active admin link into view on route changes", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");
    expect(source).toMatch(/useRoute/);
    expect(source).toMatch(/watch\([\s\S]*route\.fullPath/);
    expect(source).toMatch(/immediate:\s*true/);
    expect(source).toMatch(/scrollActiveAdminLinkIntoView/);
    expect(source).toMatch(/ref=\"adminNavRef\"/);
  });
});
