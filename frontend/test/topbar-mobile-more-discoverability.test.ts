import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("topbar mobile more discoverability", () => {
  it("keeps grouped labels inside the panel while simplifying the trigger to a single-line label", () => {
    const app = read("src/App.vue");
    const css = read("src/styles.css");

    expect(app).toMatch(/topbar-more-trigger-label/);
    expect(app).not.toMatch(/topbar-more-trigger-meta/);
    expect(app).toMatch(/topbar-more-group-label/);
    expect(app).toMatch(/设置与登录|账号与后台/);
    expect(css).not.toMatch(/\.topbar-more-trigger-meta\s*\{/);
    expect(css).toMatch(/topbar-more-group-label/);
  });
});
