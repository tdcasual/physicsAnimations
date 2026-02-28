<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { loadViewerModel, type ViewerModel } from "../features/viewer/viewerService";

const route = useRoute();

const loading = ref(false);
const model = ref<ViewerModel | null>(null);
const screenshotMode = ref(false);
const screenshotVisible = ref(false);
const modeButtonText = ref("仅截图");
const refreshSeq = ref(0);
let hideScreenshotTimer = 0;

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

const hintText = computed(() => {
  if (model.value?.status !== "ready") return "";
  return model.value.hintText;
});

const modeStateText = computed(() => {
  if (model.value?.status !== "ready") return "";
  if (!model.value.showModeToggle) return "";
  return screenshotMode.value ? "当前：截图模式" : "当前：交互模式";
});

function getRouteParams() {
  const idParam = String(route.params.id || "").trim();

  return {
    id: idParam,
  };
}

async function refresh() {
  clearHideScreenshotTimer();
  const requestSeq = refreshSeq.value + 1;
  refreshSeq.value = requestSeq;
  loading.value = true;
  try {
    const next = await loadViewerModel(getRouteParams());
    if (requestSeq !== refreshSeq.value) return;
    model.value = next;
    if (next.status === "ready") {
      document.title = next.title || "作品预览";
      screenshotMode.value = next.screenshotModeDefault;
      screenshotVisible.value = Boolean(next.screenshotUrl) && screenshotMode.value;
      modeButtonText.value = screenshotMode.value ? "进入交互" : "仅截图";
    } else {
      document.title = next.title || "作品预览";
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

function toggleMode() {
  if (model.value?.status !== "ready") return;
  if (!model.value.screenshotUrl) return;

  clearHideScreenshotTimer();
  screenshotMode.value = !screenshotMode.value;
  screenshotVisible.value = screenshotMode.value;
  modeButtonText.value = screenshotMode.value ? "进入交互" : "仅截图";
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

onMounted(refresh);
watch(
  () => [route.fullPath],
  () => {
    void refresh();
  },
);

onBeforeUnmount(() => {
  clearHideScreenshotTimer();
});
</script>

<template>
  <section class="viewer-page">
    <header class="viewer-bar">
      <div class="viewer-bar-left">
        <RouterLink class="viewer-back viewer-btn" to="/">← 返回</RouterLink>
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

      <div class="viewer-actions">
        <div v-if="modeStateText" class="viewer-mode-state">{{ modeStateText }}</div>
        <button
          v-if="model?.status === 'ready' && model.showModeToggle"
          type="button"
          class="viewer-btn"
          @click="toggleMode"
        >
          {{ modeButtonText }}
        </button>
        <a
          v-if="model?.status === 'ready'"
          class="viewer-btn"
          :href="openHref"
          target="_blank"
          rel="noreferrer"
        >
          打开原页面
        </a>
      </div>
    </header>

    <div
      v-if="model?.status === 'ready' && model.showHint"
      class="viewer-hint"
    >
      {{ hintText }}
    </div>

    <div v-if="loading" class="viewer-empty">正在加载作品...</div>
    <div v-else-if="model?.status === 'error'" class="viewer-empty">{{ model.message }}</div>

    <div v-else-if="model?.status === 'ready'" class="viewer-stage">
      <img
        v-if="model.screenshotUrl && screenshotVisible"
        class="viewer-shot"
        :src="model.screenshotUrl"
        alt=""
      />
      <iframe
        class="viewer-frame"
        :src="frameSrc"
        title="作品"
        loading="eager"
        :sandbox="frameSandbox"
        referrerpolicy="no-referrer"
        @load="onFrameLoad"
      />
    </div>
  </section>
</template>

<style scoped>
.viewer-page {
  display: grid;
  gap: 10px;
}

.viewer-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 10px 12px;
}

.viewer-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
}

.viewer-back {
  text-decoration: none;
}

.viewer-title {
  font-weight: 600;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.viewer-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.viewer-mode-state {
  font-size: calc(12px * var(--ui-scale, 1));
  color: var(--muted);
}

.viewer-btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  background: var(--surface);
  text-decoration: none;
  color: inherit;
  font-size: calc(13px * var(--ui-scale, 1));
}

.viewer-hint {
  border: 1px dashed var(--border);
  border-radius: 10px;
  color: var(--muted);
  padding: 10px;
  font-size: calc(13px * var(--ui-scale, 1));
  background: color-mix(in srgb, var(--surface) 85%, var(--bg));
}

.viewer-empty {
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 22px;
  color: var(--muted);
}

.viewer-stage {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #000;
  overflow: hidden;
}

.viewer-shot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #020617;
  z-index: 2;
}

.viewer-frame {
  width: 100%;
  min-height: var(--viewer-min-height, 70vh);
  border: 0;
  display: block;
  background: #ffffff;
}
</style>
