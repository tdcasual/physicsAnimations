import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function readFile(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("viewer sticky offset", () => {
  it("syncs the rendered topbar height into a shared css variable", () => {
    const source = readFile("src/App.vue");
    expect(source).toMatch(/ref="topbarRef"/);
    expect(source).toMatch(/ResizeObserver/);
    expect(source).toMatch(/document\.documentElement\.style\.setProperty\("--app-topbar-height"/);
  });

  it("defines a shared topbar height variable for nested sticky layouts", () => {
    const css = readFile("src/styles.css");
    expect(css).toMatch(/--app-topbar-height:\s*0px/);
  });
});
