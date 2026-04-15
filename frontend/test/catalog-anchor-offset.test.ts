import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("catalog anchor offset", () => {
  it("uses scroll-smooth for in-page navigation", () => {
    const css = read("src/styles/globals.css");
    expect(css).toMatch(/scroll-behavior:\s*smooth/);
  });
});
