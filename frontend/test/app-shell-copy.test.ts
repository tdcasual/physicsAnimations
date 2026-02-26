import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("app shell copy", () => {
  it("does not display migration-in-progress wording in brand subtitle", () => {
    const appVuePath = path.resolve(process.cwd(), "src", "App.vue");
    const source = fs.readFileSync(appVuePath, "utf8");

    expect(source.includes("迁移中")).toBe(false);
  });

  it("removes legacy brand subtitle style after subtitle copy cleanup", () => {
    const stylesPath = path.resolve(process.cwd(), "src", "styles.css");
    const css = fs.readFileSync(stylesPath, "utf8");

    expect(css.includes(".brand-subtitle")).toBe(false);
  });
});
