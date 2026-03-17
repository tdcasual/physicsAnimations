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

const stageStatusLabel = computed(() => {
  if (model.value?.status !== "ready") return "准备中";
  if (screenshotVisible.value) return "截图模式";
  if (interactiveStarted.value) {
    return model.value.deferInteractiveStart ? "交互预演" : "课堂演示";
  }
  return "待命状态";
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
      无预览，可打开原页面查看。
    </div>

    <ViewerStageShell
      v-else-if="model?.status === 'ready'"
      :screenshot-visible="screenshotVisible"
      :interactive-started="interactiveStarted"
      :stage-status-label="stageStatusLabel"
      :screenshot-url="model.screenshotUrl || ''"
      :normalized-screenshot-src="normalizedScreenshotSrc"
      :frame-src="frameSrc"
      :frame-sandbox="frameSandbox"
      :stage-transition-state="stageTransitionState"
      @frame-load="onFrameLoad"
    />
  </section>
</template>

<style src="./ViewerView.css"></style>
