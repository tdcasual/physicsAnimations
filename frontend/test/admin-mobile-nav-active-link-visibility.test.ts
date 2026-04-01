import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin mobile nav active link visibility", () => {
  it("auto-scrolls active admin link into view on route changes", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");
    expect(source).toMatch(/useRoute/);
    expect(source).toMatch(/watch\([\s\S]*route\.fullPath/);
    expect(source).toMatch(/immediate:\s*true/);
    expect(source).toMatch(/scrollActiveAdminLinkIntoView/);
    expect(source).toMatch(/ref=\"adminNavRef\"/);
  });
});
