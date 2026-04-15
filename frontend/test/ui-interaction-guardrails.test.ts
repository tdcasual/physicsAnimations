import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("ui interaction guardrails", () => {
  it("provides focus management for accessibility", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/focus/);
  });

  it("supports reduced motion preferences", () => {
    const css = read("src/styles/globals.css");

    expect(css).toMatch(/prefers-reduced-motion/);
  });
});
