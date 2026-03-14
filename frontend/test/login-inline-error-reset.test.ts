import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("login inline error reset", () => {
  it("clears stale login errors as the user keeps typing", () => {
    const source = read("src/views/LoginView.vue");

    expect(source).toMatch(/function\s+clearErrorText\(\)\s*\{/);
    expect(source).toMatch(/if\s*\(!errorText\.value\) return/);
    expect(source).toMatch(/errorText\.value\s*=\s*""/);
    expect(source.match(/@input="clearErrorText"/g)?.length ?? 0).toBe(2);
  });
});
