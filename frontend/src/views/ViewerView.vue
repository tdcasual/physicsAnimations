<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ViewerStageShell from "../components/viewer/ViewerStageShell.vue";
import { normalizePublicUrl } from "../features/catalog/catalogLink";
import { isFavoriteDemo, toggleFavoriteDemo } from "../features/catalog/favorites";
import { recordRecentActivity } from "../features/catalog/recentActivity";
import {
  clearBackNavigationFallbackHash,
  readBackNavigationFallbackHash,
  resolveBackNavigationTarget,
} from "../features/navigation/backNavigation";
import { loadViewerModel, type ViewerModel } from "../features/viewer/viewerService";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const model = ref<ViewerModel | null>(null);
const screenshotMode = ref(false);
const screenshotVisible = ref(false);
const interactiveStarted = ref(true);
const modeButtonText = ref("仅截图");
const isFavorited = ref(false);
const refreshSeq = ref(0);
let hideScreenshotTimer = 0;
const stageTransitionState = ref<"steady" | "mode-shift">("steady");
let stageTransitionTimer = 0;

const frameSrc = computed(() => {
  if (model.value?.status !== "ready") return "";
  return model.value.target;
});

const frameSandbox = computed(() => {
  if (model.value?.status !== "ready") return "allow-scripts";
  return model.value.iframeSandbox || "allow-scripts";
});

const openHref = computed(() => {
  if (model.value?.status !== "ready") return "#";
  return model.value.openHref;
});

const normalizedScreenshotSrc = computed(() => {
  if (model.value?.status !== "ready" || !model.value.screenshotUrl) return "";
  return normalizePublicUrl(model.value.screenshotUrl);
});

const hintText = computed(() => {
  if (model.value?.status !== "ready") return "";
  return model.value.hintText;
});

const modeStateText = computed(() => {
  if (model.value?.status !== "ready") return "";
  if (!model.value.showModeToggle) return "";
  return screenshotMode.value ? "截图模式" : "交互模式";
});

const stageModeLabel = computed(() => {
  if (model.value?.status !== "ready") return "准备中";
  if (screenshotVisible.value) return "讲台截图";
  if (interactiveStarted.value) {
    return model.value.deferInteractiveStart ? "交互预演" : "课堂演示";
  }
  return "待命状态";
});

const stageTransitionText = computed(() => {
  if (model.value?.status !== "ready") return "正在准备舞台…";
  if (stageTransitionState.value === "mode-shift") {
    if (screenshotVisible.value) return "切换到截图模式";
    if (interactiveStarted.value) {
      return model.value.deferInteractiveStart ? "切换到交互预演" : "切换到课堂演示";
    }
    return "切回待命";
  }
  if (screenshotVisible.value) return "静态画面已就绪。";
  if (interactiveStarted.value) {
    return model.value.deferInteractiveStart
      ? "已进入交互预演，可快速试跑关键交互。"
      : "课堂演示已就绪，可直接聚焦内容。";
  }
  return "舞台待命，等待进入交互。";
});

const viewerRailStateText = computed(() => {
  if (model.value?.status !== "ready") return "";
  if (modeStateText.value) return modeStateText.value;
  if (screenshotVisible.value) return "讲台截图";
  if (interactiveStarted.value) {
    return model.value.deferInteractiveStart ? "交互预演" : "课堂演示";
  }
  return "待命状态";
});

const viewerRailSupportText = computed(() => {
  if (model.value?.status !== "ready") return "";
  if (screenshotVisible.value) return "先看构图，再决定是否进入交互。";
  if (model.value.deferInteractiveStart && interactiveStarted.value) {
    return "交互预演已开启，可快速确认关键动作。";
  }
  if (model.value.deferInteractiveStart) return "外链默认待命，避免无效加载打断课堂节奏。";
  return "当前内容可直接作为课堂舞台使用。";
});

const viewerBarSummary = computed(() => {
  if (loading.value) return "正在准备舞台。";
  if (model.value?.status === "error") return model.value.message;
  if (screenshotVisible.value) return "先看构图，再切换交互或打开原页面。";
  if (interactiveStarted.value) {
    return model.value?.deferInteractiveStart
      ? "已进入交互预演。"
      : "课堂舞台已就绪。";
  }
  return "舞台待命，可继续进入交互。";
});

const showDeferredFallback = computed(() => {
  if (model.value?.status !== "ready") return false;
  return model.value.deferInteractiveStart && !interactiveStarted.value && !screenshotVisible.value;
});

function getRouteParams() {
  const idParam = String(route.params.id || "").trim();

  return {
    id: idParam,
  };
}

async function refresh() {
  clearHideScreenshotTimer();
  clearStageTransitionTimer();
  stageTransitionState.value = "steady";
  const requestSeq = refreshSeq.value + 1;
  refreshSeq.value = requestSeq;
  loading.value = true;
  document.title = "正在加载作品...";
  screenshotVisible.value = false;
  try {
    const next = await loadViewerModel(getRouteParams());
    if (requestSeq !== refreshSeq.value) return;
    model.value = next;
    if (next.status === "ready") {
      const itemId = getRouteParams().id;
      document.title = next.title || "作品预览";
      if (itemId) {
        recordRecentActivity(itemId);
        isFavorited.value = isFavoriteDemo(itemId);
      } else {
        isFavorited.value = false;
      }
      interactiveStarted.value = !next.deferInteractiveStart;
      screenshotMode.value = next.screenshotModeDefault;
      screenshotVisible.value = Boolean(next.screenshotUrl) && screenshotMode.value;
      modeButtonText.value = screenshotMode.value ? "进入交互" : "仅截图";
    } else {
      document.title = next.title || "作品预览";
      isFavorited.value = false;
      interactiveStarted.value = true;
      screenshotVisible.value = false;
    }
  } finally {
    if (requestSeq === refreshSeq.value) {
      loading.value = false;
    }
  }
}

function clearHideScreenshotTimer() {
  if (!hideScreenshotTimer) return;
  window.clearTimeout(hideScreenshotTimer);
  hideScreenshotTimer = 0;
}

function clearStageTransitionTimer() {
  if (!stageTransitionTimer) return;
  window.clearTimeout(stageTransitionTimer);
  stageTransitionTimer = 0;
}

function triggerStageTransition() {
  clearStageTransitionTimer();
  stageTransitionState.value = "mode-shift";
  stageTransitionTimer = window.setTimeout(() => {
    stageTransitionTimer = 0;
    stageTransitionState.value = "steady";
  }, 320);
}

function toggleMode() {
  if (model.value?.status !== "ready") return;
  if (!model.value.screenshotUrl) return;

  clearHideScreenshotTimer();
  if (screenshotMode.value) {
    interactiveStarted.value = true;
  } else {
    interactiveStarted.value = false;
  }
  screenshotMode.value = !screenshotMode.value;
  screenshotVisible.value = screenshotMode.value;
  modeButtonText.value = screenshotMode.value ? "进入交互" : "仅截图";
  triggerStageTransition();
}

function startInteractive() {
  if (model.value?.status !== "ready") return;
  clearHideScreenshotTimer();
  interactiveStarted.value = true;
  screenshotMode.value = false;
  screenshotVisible.value = false;
  modeButtonText.value = "仅截图";
  triggerStageTransition();
}

function stopInteractive() {
  if (model.value?.status !== "ready") return;
  clearHideScreenshotTimer();
  interactiveStarted.value = false;
  screenshotMode.value = false;
  screenshotVisible.value = false;
  modeButtonText.value = "仅截图";
  triggerStageTransition();
}

function onFrameLoad() {
  if (model.value?.status !== "ready") return;
  if (screenshotMode.value) return;
  clearHideScreenshotTimer();
  hideScreenshotTimer = window.setTimeout(() => {
    hideScreenshotTimer = 0;
    if (!screenshotMode.value) {
      screenshotVisible.value = false;
    }
  }, 250);
}

function toggleFavorite() {
  if (model.value?.status !== "ready") return;
  const itemId = getRouteParams().id;
  if (!itemId) return;
  isFavorited.value = toggleFavoriteDemo(itemId).isFavorite;
}

function goBack() {
  const target = resolveBackNavigationTarget({
    historyState: window.history.state,
    fallbackHash: readBackNavigationFallbackHash(),
  });
  clearBackNavigationFallbackHash();

  if (target.mode === "history-back") {
    router.back();
    return;
  }
  void router.replace(target.hash ? { path: target.path, hash: target.hash } : target.path);
}

onMounted(refresh);
watch(
  () => [route.fullPath],
  () => {
    void refresh();
  },
);

onBeforeUnmount(() => {
  clearHideScreenshotTimer();
  clearStageTransitionTimer();
});
</script>

<template>
  <section class="viewer-page viewer-page--staged">
    <header class="viewer-bar viewer-bar--compact">
      <div class="viewer-bar-left">
        <button type="button" class="viewer-back viewer-btn" @click="goBack">← 返回</button>
        <div class="viewer-bar-copy">
          <div class="viewer-title-block">
            <p class="viewer-kicker">课堂演示舞台</p>
            <div class="viewer-title">
              {{
                loading
                  ? "正在加载..."
                  : model?.status === "ready"
                    ? model.title
                    : (model?.title ?? "作品预览")
              }}
            </div>
          </div>
          <p class="viewer-bar-summary">{{ viewerBarSummary }}</p>
        </div>
      </div>

      <div class="viewer-actions">
        <button
          v-if="!loading && model?.status === 'ready' && model.showModeToggle"
          type="button"
          class="viewer-btn"
          @click="toggleMode"
        >
          {{ modeButtonText }}
        </button>
        <button
          v-else-if="!loading && model?.status === 'ready' && model.deferInteractiveStart && !interactiveStarted"
          type="button"
          class="viewer-btn"
          @click="startInteractive"
        >
          尝试交互
        </button>
        <button
          v-else-if="!loading && model?.status === 'ready' && model.deferInteractiveStart && interactiveStarted"
          type="button"
          class="viewer-btn"
          @click="stopInteractive"
        >
          关闭交互
        </button>
        <a
          v-if="!loading && model?.status === 'ready'"
          class="viewer-btn"
          :href="openHref"
          target="_blank"
          rel="noreferrer"
        >
          打开原页面
        </a>
        <button v-if="!loading && model?.status === 'ready'" type="button" class="viewer-btn" @click="toggleFavorite">
          {{ isFavorited ? '已收藏' : '收藏演示' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="viewer-empty">正在加载作品...</div>
    <div v-else-if="model?.status === 'error'" class="viewer-empty">{{ model.message }}</div>

    <div v-else-if="showDeferredFallback" class="viewer-empty viewer-empty--deferred">
      当前无法提供预览截图。你可以直接打开原页面，或手动尝试交互加载该外链。
    </div>

    <ViewerStageShell
      v-else-if="model?.status === 'ready'"
      :screenshot-visible="screenshotVisible"
      :interactive-started="interactiveStarted"
      :mode-state-text="modeStateText"
      :viewer-rail-state-text="viewerRailStateText"
      :show-hint="model.showHint"
      :hint-text="hintText"
      :viewer-rail-support-text="viewerRailSupportText"
      :stage-mode-label="stageModeLabel"
      :stage-transition-text="stageTransitionText"
      :screenshot-url="model.screenshotUrl || ''"
      :normalized-screenshot-src="normalizedScreenshotSrc"
      :frame-src="frameSrc"
      :frame-sandbox="frameSandbox"
      :stage-transition-state="stageTransitionState"
      @frame-load="onFrameLoad"
    />
  </section>
</template>

<style>
.viewer-page {
  display: grid;
  gap: 16px;
}

.viewer-page--staged {
  gap: 14px;
}

.viewer-bar {
  position: sticky;
  top: var(--app-topbar-height, 0px);
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  border: 1px solid color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 22px;
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, var(--surface)), color-mix(in oklab, var(--surface) 94%, var(--paper))),
    var(--surface);
  padding: 14px 16px;
  box-shadow: 0 26px 48px -36px color-mix(in oklab, var(--ink) 24%, transparent);
}

.viewer-bar--compact {
  gap: 10px;
  padding: 12px 14px;
  border-radius: 20px;
}

.viewer-bar-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
}

.viewer-back {
  text-decoration: none;
  white-space: nowrap;
}

.viewer-bar-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.viewer-title-block {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.viewer-kicker,
.viewer-rail-label,
.viewer-stage-kicker {
  margin: 0;
  color: color-mix(in oklab, var(--accent-copper-strong) 72%, var(--text));
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.viewer-title {
  font-family: "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(1.2rem, 1.02rem + 0.55vw, 1.65rem);
  font-weight: 600;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.viewer-bar-summary {
  margin: 0;
  max-width: 48ch;
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale, 1));
  line-height: 1.45;
}

.viewer-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.viewer-btn {
  border: 1px solid color-mix(in oklab, var(--line-strong) 16%, var(--border));
  border-radius: 999px;
  padding: 6px 12px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  background: color-mix(in oklab, var(--surface) 88%, var(--paper));
  text-decoration: none;
  color: inherit;
  font-size: calc(13px * var(--ui-scale, 1));
  cursor: pointer;
}

.viewer-empty {
  border: 1px dashed color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 18px;
  padding: 22px;
  color: var(--muted);
  background: color-mix(in oklab, var(--surface) 84%, var(--paper));
}

@media (max-width: 640px) {
  .viewer-bar--compact {
    gap: 6px;
    padding: 8px 10px;
  }

  .viewer-bar-left {
    gap: 8px;
  }

  .viewer-bar-copy {
    gap: 2px;
  }

  .viewer-title-block {
    gap: 1px;
  }

  .viewer-kicker {
    display: none;
  }

  .viewer-title {
    font-size: clamp(1.06rem, 0.96rem + 0.4vw, 1.32rem);
  }

  .viewer-bar-summary {
    display: none;
  }

  .viewer-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
