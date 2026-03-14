import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("login visual polish", () => {
  it("adds a guided login panel with supporting atlas copy", () => {
    const source = read("src/views/LoginView.vue");

    expect(source).toMatch(/login-panel/);
    expect(source).toMatch(/login-intro/);
    expect(source).toMatch(/login-note/);
    expect(source).toMatch(/返回工作区/);
  });
});
