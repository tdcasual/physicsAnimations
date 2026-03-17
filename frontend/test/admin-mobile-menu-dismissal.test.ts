import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin mobile menu dismissal", () => {
  it("supports closing the mobile admin menu with Escape and backdrop click", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/@keydown\.esc\.window/);
    expect(source).toMatch(/admin-nav-backdrop/);
    expect(source).toMatch(/v-if="mobileNavOpen"/);
  });
});
