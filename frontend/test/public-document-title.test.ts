import { nextTick } from "vue";
import { describe, expect, it } from "vitest";
import { mountCatalogViewChromeHarness } from "./helpers/catalogViewChromeHarness";
import fs from "node:fs";
import path from "node:path";

describe("public route document titles", () => {
  it("updates catalog titles for loading, error, and active hero context instead of keeping the app default", async () => {
    const harness = await mountCatalogViewChromeHarness({
      loading: true,
      heroTitle: "目录首页",
    });

    expect(document.title).toBe("正在加载目录 - 我的学科演示集");

    harness.loading.value = false;
    harness.loadError.value = "加载失败";
    await nextTick();
    expect(document.title).toBe("加载目录失败 - 我的学科演示集");

    harness.loadError.value = "";
    harness.heroTitle.value = "力学演示";
    await nextTick();
    expect(document.title).toBe("力学演示 - 我的学科演示集");

    harness.cleanup();
  });

  it("sets a dedicated login page title", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/views/LoginView.vue"), "utf8");

    expect(source).toMatch(/onMounted/);
    expect(source).toMatch(/document\.title = "管理员登录 - 管理后台"/);
  });
});
