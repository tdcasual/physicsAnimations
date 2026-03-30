import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("topbar responsive layout", () => {
  it("uses a unified more-panel for mobile", () => {
    const source = read("src/App.vue");
    const css = read("src/AppShell.css");

    expect(source).toMatch(/topbar-more-panel/);
    expect(source).toMatch(/topbar-more-trigger/);
    expect(css).toMatch(/topbar-more-panel/);
    expect(css).toMatch(/@media\s*\(max-width:/);
  });

  it("hides inline actions on mobile", () => {
    const css = read("src/AppShell.css");

    expect(css).toMatch(/topbar-inline-actions/);
    expect(css).toMatch(/@media\s*\(max-width:\s*768px\)/);
  });
});
