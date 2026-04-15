import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("mobile touch targets", () => {
  it("uses appropriately sized touch targets on mobile", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/h-10/);
    expect(app).toMatch(/min-h-\[44px\]|h-9|h-10/);
  });
});
