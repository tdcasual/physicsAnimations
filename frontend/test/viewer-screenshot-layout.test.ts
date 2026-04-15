import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("viewer screenshot layout", () => {
  it("uses aspect ratio and rounded corners for the stage", () => {
    const shell = read("src/components/viewer/ViewerStageShell.vue");

    expect(shell).toMatch(/rounded-2xl/);
    expect(shell).toMatch(/rounded-xl/);
  });

  it("keeps screenshot in a contained stage with object-fit", () => {
    const shell = read("src/components/viewer/ViewerStageShell.vue");

    expect(shell).toMatch(/object-contain/);
    expect(shell).toMatch(/absolute inset-0/);
  });

  it("defers iframe mounting until interactive mode starts", () => {
    const shell = read("src/components/viewer/ViewerStageShell.vue");

    expect(shell).toMatch(/v-if="props\.interactiveStarted"/);
    expect(shell).toMatch(/v-show="!props\.screenshotVisible"/);
  });

  it("provides minimal stage chrome while loading and error states", () => {
    const viewer = read("src/views/ViewerView.vue");

    expect(viewer).toMatch(/loading/);
    expect(viewer).toMatch(/model\?\.status === 'error'/);
    expect(viewer).toMatch(/showDeferredFallback/);
  });
});
