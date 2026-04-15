import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("classroom mode ui", () => {
  it("adds classroom mode toggle button in app shell", () => {
    const appSource = read("src/App.vue");
    expect(appSource).toMatch(/课堂模式/);
    expect(appSource).toMatch(/toggleClassroomMode/);
  });

  it("defines classroom mode style hooks in global stylesheet", () => {
    const css = read("src/styles/globals.css");
    expect(css).toMatch(/\[data-classroom="on"\]/);
    expect(css).toMatch(/--content-max-width/);
  });
});
