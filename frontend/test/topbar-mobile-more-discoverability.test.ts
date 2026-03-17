import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("topbar mobile more discoverability", () => {
  it("adds supporting copy on the trigger and grouped labels inside the panel", () => {
    const app = read("src/App.vue");
    const css = read("src/styles.css");

    expect(app).toMatch(/topbar-more-trigger-label/);
    expect(app).toMatch(/topbar-more-trigger-meta/);
    expect(app).toMatch(/topbar-more-group-label/);
    expect(app).toMatch(/设置与登录|账号与后台/);
    expect(css).toMatch(/topbar-more-trigger-meta/);
    expect(css).toMatch(/topbar-more-group-label/);
  });
});
