import { describe, expect, it } from "vitest";
import { resolveBackNavigationMode, resolveBackNavigationTarget } from "../src/features/navigation/backNavigation";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("return navigation behavior", () => {
  it("uses router history back only when vue-router history contains a back entry", () => {
    expect(resolveBackNavigationMode(null)).toBe("replace-home");
    expect(resolveBackNavigationMode({})).toBe("replace-home");
    expect(resolveBackNavigationMode({ back: null })).toBe("replace-home");
    expect(resolveBackNavigationMode({ back: "/" })).toBe("history-back");
  });

  it("supports section-aware fallback targets when history back is unavailable", () => {
    expect(resolveBackNavigationTarget({ historyState: null, fallbackHash: "#catalog-recent" })).toEqual({
      mode: "replace-home",
      path: "/",
      hash: "#catalog-recent",
    });
    expect(resolveBackNavigationTarget({ historyState: { back: "/" }, fallbackHash: "#catalog-favorites" })).toEqual({
      mode: "history-back",
      path: "",
      hash: "",
    });
  });

  it("wires viewer and library folder return controls through the shared back-navigation helper", () => {
    const viewerSource = read("src/views/ViewerView.vue");
    const folderSource = read("src/views/LibraryFolderView.vue");

    expect(viewerSource).toMatch(/useRouter/);
    expect(viewerSource).toMatch(/resolveBackNavigationTarget/);
    expect(viewerSource).toMatch(/@click="goBack"/);
    expect(viewerSource).not.toMatch(/RouterLink class="viewer-back viewer-btn" to="\/"/);

    expect(folderSource).toMatch(/useRouter/);
    expect(folderSource).toMatch(/resolveBackNavigationTarget/);
    expect(folderSource).toMatch(/@click="goBack"/);
    expect(folderSource).not.toMatch(/RouterLink to="\/" class="btn btn-ghost"/);
  });
});
