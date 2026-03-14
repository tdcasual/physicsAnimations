import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("public route document titles", () => {
  it("updates catalog titles for loading, error, and active hero context instead of keeping the app default", () => {
    const source = read("src/views/CatalogView.vue");

    expect(source).toMatch(/watchEffect/);
    expect(source).toMatch(/document\.title = "正在加载目录 - 我的学科演示集"/);
    expect(source).toMatch(/document\.title = "加载目录失败 - 我的学科演示集"/);
    expect(source).toMatch(/document\.title = `\$\{heroTitle\.value\} - 我的学科演示集`/);
  });

  it("sets a dedicated login page title", () => {
    const source = read("src/views/LoginView.vue");

    expect(source).toMatch(/onMounted/);
    expect(source).toMatch(/document\.title = "管理员登录 - 管理后台"/);
  });
});
