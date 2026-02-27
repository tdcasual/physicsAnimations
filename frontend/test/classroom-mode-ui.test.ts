import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("classroom mode ui", () => {
  it("adds classroom mode toggle button in app shell", () => {
    const appSource = read("src/App.vue");
    expect(appSource).toMatch(/课堂模式/);
    expect(appSource).toMatch(/toggleClassroomMode/);
  });

  it("defines classroom mode style hooks in global stylesheet", () => {
    const css = read("src/styles.css");
    expect(css).toMatch(/:root\[data-classroom="on"\]/);
    expect(css).toMatch(/--content-max-width/);
  });
});
