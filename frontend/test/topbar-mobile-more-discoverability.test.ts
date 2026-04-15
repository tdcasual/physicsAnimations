import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("topbar mobile more discoverability", () => {
  it("provides a hamburger menu trigger on mobile", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/Menu/);
    expect(source).toMatch(/X/);
    expect(source).toMatch(/mobileMenuOpen/);
  });

  it("shows mobile menu panel when triggered", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/mobileMenuOpen/);
    expect(source).toMatch(/border-t/);
  });
});
