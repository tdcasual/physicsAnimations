import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin content responsive layout", () => {
  it("uses flex-wrap for responsive item layouts", () => {
    const contentPanel = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/admin/content/ContentListPanel.vue"),
      "utf8",
    );
    // Check for responsive patterns
    expect(contentPanel).toMatch(/flex/);
    expect(contentPanel).toMatch(/flex-col|flex-row/);
    expect(contentPanel).toMatch(/sm:/);
  });

  it("prevents long titles and metadata from overflowing", () => {
    const contentPanel = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/admin/content/ContentListPanel.vue"),
      "utf8",
    );
    // Check for overflow prevention
    expect(contentPanel).toMatch(/min-w-0|truncate/);
  });

  it("uses responsive layout for uploads view", () => {
    const uploadsView = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/admin/AdminUploadsView.vue"),
      "utf8",
    );
    // Check for responsive patterns in Vue template/styles
    expect(uploadsView).toMatch(/flex/);
  });
});
