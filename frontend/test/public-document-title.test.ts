import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("public route document titles", () => {
  it("sets a dedicated login page title", () => {
    const source = read("src/views/LoginView.vue");

    expect(source).toMatch(/document\.title/);
    expect(source).toMatch(/管理员登录|科学演示集/);
  });
});
