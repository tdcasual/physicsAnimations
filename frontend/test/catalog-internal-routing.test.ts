import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("catalog internal routing", () => {
  it("uses RouterLink for internal navigation", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/RouterLink/);
    expect(app).toMatch(/to="\/"/);
  });
});
