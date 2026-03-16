import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin layout navigation", () => {
  it("provides a direct link back to public catalog from the admin shell header", () => {
    const source = [readFile("src/views/admin/AdminLayoutView.vue"), readFile("src/components/admin/AdminShellHeader.vue")].join("\n");
    expect(source).toMatch(/to="\/"/);
    expect(source).toMatch(/主页面/);
  });
});
