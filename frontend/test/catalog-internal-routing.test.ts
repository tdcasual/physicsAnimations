import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog internal routing", () => {
  it("uses router-aware card navigation for in-app viewer and folder links", () => {
    const source = read("src/views/CatalogView.vue");

    expect(source).toMatch(/import\s+\{[^}]*RouterLink[^}]*\}\s+from\s+"vue-router"/);
    expect(source).toMatch(/getCardNavigationComponent/);
    expect(source).toMatch(/getCardNavigationProps/);
    expect(source).toMatch(/:is="getCardNavigationComponent\(getFolderHref\(folder\.id\)\)"/);
    expect(source).toMatch(/v-bind="getCardNavigationProps\(getFolderHref\(folder\.id\)\)"/);
    expect(source).toMatch(/:is="getCardNavigationComponent\(getItemHref\(item\)\)"/);
    expect(source).toMatch(/v-bind="getCardNavigationProps\(getItemHref\(item\)\)"/);
  });
});
