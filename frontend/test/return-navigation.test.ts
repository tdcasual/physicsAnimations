import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBackNavigationMode } from "../src/features/navigation/backNavigation";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("return navigation behavior", () => {
  it("uses router history back only when vue-router history contains a back entry", () => {
    expect(resolveBackNavigationMode(null)).toBe("replace-home");
    expect(resolveBackNavigationMode({})).toBe("replace-home");
    expect(resolveBackNavigationMode({ back: null })).toBe("replace-home");
    expect(resolveBackNavigationMode({ back: "/" })).toBe("history-back");
  });

  it("wires viewer and library folder return controls through the shared back-navigation helper", () => {
    const viewerSource = read("src/views/ViewerView.vue");
    const folderSource = read("src/views/LibraryFolderView.vue");

    expect(viewerSource).toMatch(/useRouter/);
    expect(viewerSource).toMatch(/resolveBackNavigationMode/);
    expect(viewerSource).toMatch(/@click="goBack"/);
    expect(viewerSource).not.toMatch(/RouterLink class="viewer-back viewer-btn" to="\/"/);

    expect(folderSource).toMatch(/useRouter/);
    expect(folderSource).toMatch(/resolveBackNavigationMode/);
    expect(folderSource).toMatch(/@click="goBack"/);
    expect(folderSource).not.toMatch(/RouterLink to="\/" class="btn btn-ghost"/);
  });
});
