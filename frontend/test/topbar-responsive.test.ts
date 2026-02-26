import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("topbar responsive layout", () => {
  it("defines a mobile breakpoint that allows topbar wrapping", () => {
    const css = readFile("src/styles.css");
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
    expect(css).toMatch(/\.topbar-inner\s*\{[\s\S]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.actions\s*\{[\s\S]*flex-wrap:\s*wrap/);
  });
});
