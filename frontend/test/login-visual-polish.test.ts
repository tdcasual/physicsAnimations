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

  it("turns the desktop login page into a contextual split panel instead of a lone floating form", () => {
    const source = read("src/views/LoginView.vue");

    expect(source).toMatch(/class="login-copy"/);
    expect(source).toMatch(/class="login-note"/);
    expect(source).toMatch(/内容、资源库、分类与系统配置|内容、上传、资源库与分类/);
    expect(source).toMatch(/@media\s*\(min-width:\s*960px\)\s*\{/);
    expect(source).toMatch(/grid-template-columns:\s*minmax\(0,\s*1\.05fr\)\s*minmax\(280px,\s*0\.95fr\);/);
  });
});
