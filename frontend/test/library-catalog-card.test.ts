import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog library cards", () => {
  it("renders dedicated folder card markup in catalog view", () => {
    const source = read("src/views/CatalogView.vue");
    expect(source).toMatch(/catalog-folder-card/);
    expect(source).toMatch(/library\/folder\//);
  });
});
