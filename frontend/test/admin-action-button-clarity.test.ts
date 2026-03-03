import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin action button clarity", () => {
  it("ensures primary action buttons in admin panels have sufficient desktop width", () => {
    const css = read("src/styles.css");
    expect(css).toMatch(/\.admin-actions\s+\.btn-primary\s*\{[\s\S]*min-inline-size:\s*96px/);
  });
});
