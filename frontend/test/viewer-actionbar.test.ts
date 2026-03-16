import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("viewer action bar", () => {
  it("keeps action bar sticky below the shared topbar and pairs it with a staged presentation shell", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/class="viewer-page viewer-page--staged"/);
    expect(source).toMatch(/class="viewer-bar viewer-bar--compact"/);
    expect(source).toMatch(/class="viewer-bar-copy"/);
    expect(source).toMatch(/class="viewer-bar-summary"/);
    expect(source).toMatch(/class="viewer-stage-shell"/);
    expect(source).toMatch(/class="viewer-stage-proscenium"/);
    expect(source).toMatch(/class="viewer-stage-status-band"/);
    expect(source).toMatch(/class="viewer-stage-status-pill"/);
    expect(source).not.toMatch(/class="viewer-rail"/);
    expect(source).toMatch(/\.viewer-bar\s*\{[\s\S]*position:\s*sticky/);
    expect(source).toMatch(/\.viewer-bar\s*\{[\s\S]*top:\s*var\(--app-topbar-height,\s*0px\)/);
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
    expect(source).toMatch(/\.viewer-title\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
    expect(source).toMatch(/\.viewer-title\s*\{[\s\S]*word-break:\s*break-word/);
    expect(source).toMatch(/\.viewer-title\s*\{[\s\S]*min-width:\s*0/);
  });

  it("moves preview hint copy into a compact stage status band instead of a side rail", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/class="viewer-stage-status-band"/);
    expect(source).toMatch(/class="viewer-stage-status-pill viewer-stage-status-pill--lead"/);
    expect(source).not.toMatch(/class="viewer-rail-card/);
    expect(source).not.toMatch(/class="viewer-hint"/);
  });

  it("adds a visible mode chip, transition note, and one compact status band around the stage", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/const stageModeLabel = computed/);
    expect(source).toMatch(/const stageTransitionText = computed/);
    expect(source).toMatch(/class="viewer-stage-status-band"/);
    expect(source).not.toMatch(/class="viewer-stage-brief/);
    expect(source).not.toMatch(/class="viewer-stage-status-grid"/);
    expect(source).toMatch(/class="viewer-mode-chip"/);
    expect(source).toMatch(/class="viewer-transition-note"/);
  });

  it("hides stale ready-state actions while the next viewer route is still loading", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/document\.title = "正在加载作品\.\.\."/);
    expect(source).toMatch(/:show-hint="model\.showHint"/);
    expect(source).toMatch(/class="viewer-stage-status-pill"/);
    expect(source).toMatch(/v-if="!loading && model\?\.status === 'ready' && model\.showModeToggle"/);
    expect(source).toMatch(/v-if="!loading && model\?\.status === 'ready'"/);
    expect(source).toMatch(/props\.modeStateText/);
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
    expect(source).toMatch(/@keyframes viewer-stage-glow/);
    expect(source).toMatch(/@keyframes viewer-stage-shift/);
    expect(source).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(source).toMatch(/\.viewer-stage-frame--transitioning/);
  });

  it("delegates the staged rail-and-screen presentation to a dedicated component", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/import ViewerStageShell/);
    expect(source).toMatch(/<ViewerStageShell/);
    expect(source).not.toMatch(/class="viewer-stage-shell"/);
  });

  it("adds teacher workflow actions for recent activity capture and favorite toggling", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/recordRecentActivity/);
    expect(source).toMatch(/toggleFavoriteDemo|toggleFavorite/);
    expect(source).toMatch(/收藏演示/);
    expect(source).toMatch(/已收藏/);
  });

  it("tightens the compact viewer header on small screens so the stage arrives sooner", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-bar--compact\s*\{[\s\S]*padding:\s*8px 10px/);
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-bar--compact\s*\{[\s\S]*gap:\s*6px/);
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-bar-left\s*\{[\s\S]*gap:\s*8px/);
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-kicker\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-bar-summary\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/\.viewer-back\s*\{[\s\S]*white-space:\s*nowrap/);
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-title\s*\{[\s\S]*font-size:\s*clamp\(1\.06rem,\s*0\.96rem \+ 0\.4vw,\s*1\.32rem\)/);
  });
});
