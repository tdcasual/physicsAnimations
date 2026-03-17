import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin mobile nav keyboard visibility", () => {
  it("scrolls focused nav links into view on focusin", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");
    expect(source).toMatch(/@focusin=\"onAdminNavFocusIn\"/);
    expect(source).toMatch(/scrollIntoView\(\{\s*block:\s*\"nearest\",\s*inline:\s*\"nearest\"/);
  });
});
