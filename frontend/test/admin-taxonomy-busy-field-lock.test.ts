import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

function countLocks(source: string): number {
  return [...source.matchAll(/:disabled="saving"/g)].length;
}

describe("admin taxonomy busy field locking", () => {
  it("locks group editor controls while a save is in flight", () => {
    const source = read("src/views/admin/taxonomy/GroupEditorPanel.vue");
    expect(countLocks(source)).toBeGreaterThanOrEqual(12);
  });

  it("locks category editor controls while a save is in flight", () => {
    const source = read("src/views/admin/taxonomy/CategoryEditorPanel.vue");
    expect(countLocks(source)).toBeGreaterThanOrEqual(6);
  });
});
