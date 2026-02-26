import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin content responsive layout", () => {
  it("wraps item head and action row on narrow screens", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/admin/AdminContentView.vue"),
      "utf8",
    );
    expect(source).toMatch(/\.item-head\s*\{[\s\S]*flex-wrap:\s*wrap/);
    expect(source).toMatch(/\.item-actions\s*\{[\s\S]*flex-wrap:\s*wrap/);
    expect(source).toMatch(/\.list-header\s*\{[\s\S]*flex-wrap:\s*wrap/);
  });
});
