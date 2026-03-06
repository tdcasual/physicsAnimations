import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("app shell visual polish", () => {
  it("extracts topbar polish into a dedicated shell stylesheet", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/AppShell\.css/);
  });

  it("adds subtle topbar highlight and button hover feedback", () => {
    const css = read("src/AppShell.css");

    expect(css).toMatch(/topbar::after/);
    expect(css).toMatch(/topbar[\s\S]*box-shadow:/);
    expect(css).toMatch(/btn:hover/);
  });
});
