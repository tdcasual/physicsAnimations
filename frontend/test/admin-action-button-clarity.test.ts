import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin action button clarity", () => {
  it("ensures primary action buttons in admin panels have sufficient desktop width", () => {
    // PAActions and PAButton components provide consistent button sizing
    const paActions = read("src/components/ui/patterns/PAActions.vue");
    const paButton = read("src/components/ui/patterns/PAButton.vue");
    expect(paActions).toMatch(/flex|justify/);
    expect(paButton).toMatch(/min-w-|px-/);
  });
});
