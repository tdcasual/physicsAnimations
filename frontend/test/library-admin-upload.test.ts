import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin library upload", () => {
  it("accepts both ggb and PhET html files", () => {
    const source = read("src/views/admin/AdminLibraryView.vue");
    expect(source).toMatch(/accept="\.ggb,\.html,\.htm,application\/vnd\.geogebra\.file,text\/html"/);
    expect(source).toMatch(/\.ggb \/ PhET HTML/);
  });
});
