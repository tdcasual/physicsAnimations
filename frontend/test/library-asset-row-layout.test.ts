import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("library asset row layout", () => {
  it("keeps asset info visible by stacking actions under info in the middle column list", () => {
    const css = read("src/views/admin/library/AdminLibraryView.css");
    expect(css).toMatch(/\.asset-list\s*>\s*\.asset-item\s*\{[\s\S]*display:\s*grid/);
    expect(css).toMatch(/\.asset-list\s*>\s*\.asset-item\s*\{[\s\S]*grid-template-areas:\s*\"select main\"[\s\S]*\"select actions\"/);
    expect(css).toMatch(/\.asset-list\s*>\s*\.asset-item\s*\.asset-main\s*\{[\s\S]*grid-area:\s*main/);
    expect(css).toMatch(/\.asset-list\s*>\s*\.asset-item\s*\.asset-actions-inline\s*\{[\s\S]*grid-area:\s*actions/);
  });
});
