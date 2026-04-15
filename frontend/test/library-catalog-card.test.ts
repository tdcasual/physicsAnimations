import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("library catalog card", () => {
  it("renders folder cards with gallery styling in the catalog", () => {
    const source = read("src/views/catalog/components/FolderCard.vue");
    expect(source).toMatch(/FolderOpen/);
    // Gallery style - no rounded corners
    expect(source).not.toMatch(/rounded-2xl|rounded-xl|rounded-lg/);
    expect(source).toMatch(/aspect-\[3\/2\]/);
  });
});
