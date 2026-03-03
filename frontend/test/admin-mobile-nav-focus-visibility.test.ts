import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin mobile nav keyboard visibility", () => {
  it("scrolls focused nav links into view on focusin", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");
    expect(source).toMatch(/@focusin=\"onAdminNavFocusIn\"/);
    expect(source).toMatch(/scrollIntoView\(\{\s*block:\s*\"nearest\",\s*inline:\s*\"nearest\"/);
  });
});
