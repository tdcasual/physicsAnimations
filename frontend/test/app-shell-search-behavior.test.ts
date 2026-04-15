import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("app shell search behavior", () => {
  it("keeps live search only on the catalog route", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/isCatalogRoute/);
    expect(app).toMatch(/type="search"/);
    expect(app).toMatch(/useCatalogSearch/);
  });

  it("renders a direct return-to-catalog affordance via the brand logo on non-catalog routes", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/to="\/"/);
    expect(app).not.toMatch(/router\.push\(nextPath\)/);
  });
});
