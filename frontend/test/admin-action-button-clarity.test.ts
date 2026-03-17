import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin action button clarity", () => {
  it("ensures primary action buttons in admin panels have sufficient desktop width", () => {
    const css = read("src/styles.css");
    expect(css).toMatch(/\.admin-actions\s+\.btn-primary\s*\{[\s\S]*min-inline-size:\s*96px/);
  });
});
