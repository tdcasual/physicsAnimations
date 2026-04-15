import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("viewer action bar", () => {
  it("uses Tailwind CSS for styling instead of dedicated stylesheet", () => {
    const source = read("src/views/ViewerView.vue");

    expect(source).toMatch(/class="flex min-h-screen flex-col bg-background"/);
  });

  it("keeps action bar sticky below the shared topbar and pairs it with a staged presentation shell", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/sticky top-16/);
    expect(source).toMatch(/z-30/);
    expect(source).toMatch(/bg-background\/95/);
    expect(source).toMatch(/backdrop-blur/);
    expect(source).toMatch(/<ViewerStageShell/);
  });

  it("ignores stale async viewer refresh responses after route changes", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/const refreshSeq = ref\(0\)/);
    expect(source).toMatch(/const requestSeq = refreshSeq\.value \+ 1/);
    expect(source).toMatch(/refreshSeq\.value = requestSeq/);
    expect(source).toMatch(/if \(requestSeq !== refreshSeq\.value\) return/);
    expect(source).toMatch(/if \(requestSeq === refreshSeq\.value\) \{/);
  });

  it("wraps long titles in viewer header to avoid mobile overflow", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/truncate/);
  });

  it("moves preview into a compact stage layout", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/rounded-2xl/);
    expect(source).toMatch(/aspect-\[4\/3\]|min-h-\[60vh\]/);
  });

  it("uses a single stageStatusLabel computed for the stage", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/const stageStatusLabel = computed/);
  });

  it("hides stale ready-state actions while the next viewer route is still loading", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/document\.title = "正在加载作品\.\.\."/);
    expect(source).toMatch(/v-if="!loading && model\?\.status === 'ready' && model\.showModeToggle"/);
    expect(source).toMatch(/v-if="!loading && model\?\.status === 'ready'"/);
  });

  it("defers external iframe mounting until the user explicitly starts interaction", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/const interactiveStarted = ref\(true\)/);
    expect(source).toMatch(/interactiveStarted\.value = !next\.deferInteractiveStart/);
    expect(source).toMatch(/v-if="props\.interactiveStarted"/);
    expect(source).toMatch(/尝试交互/);
  });

  it("keeps a close-interaction escape hatch for deferred external previews without screenshots", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/function stopInteractive\(/);
    expect(source).toMatch(/interactiveStarted\.value = false/);
    expect(source).toMatch(/关闭交互/);
  });

  it("tears down the iframe when switching external previews back to screenshot mode", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/function toggleMode\([\s\S]*if \(screenshotMode\.value\) \{[\s\S]*interactiveStarted\.value = true/);
    expect(source).toMatch(/function toggleMode\([\s\S]*else \{[\s\S]*interactiveStarted\.value = false/);
  });

  it("normalizes screenshot image src so relative content paths work under /viewer/:id", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/normalizePublicUrl/);
    expect(source).toMatch(/const normalizedScreenshotSrc = computed/);
    expect(source).toMatch(/:normalized-screenshot-src="normalizedScreenshotSrc"/);
  });

  it("defines purposeful stage animations with a reduced-motion fallback", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/@keyframes mode-shift/);
    expect(source).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(source).toMatch(/animate-mode-shift/);
  });

  it("delegates the staged presentation to a dedicated component", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/import ViewerStageShell/);
    expect(source).toMatch(/<ViewerStageShell/);
  });

  it("adds teacher workflow actions for recent activity capture and favorite toggling", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/recordRecentActivity/);
    expect(source).toMatch(/toggleFavorite/);
    expect(source).toMatch(/收藏/);
  });

  it("tightens the compact viewer header on small screens so the stage arrives sooner", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/flex-col/);
    expect(source).toMatch(/sm:flex-row/);
    expect(source).toMatch(/gap-2/);
    expect(source).toMatch(/gap-3/);
  });

  it("switches viewer pages into a more immersive mobile shell with tighter shared chrome", () => {
    const viewerSource = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");

    expect(viewerSource).toMatch(/sticky top-16/);
    expect(viewerSource).toMatch(/px-4/);
    expect(viewerSource).toMatch(/sm:px-6/);
  });
});
