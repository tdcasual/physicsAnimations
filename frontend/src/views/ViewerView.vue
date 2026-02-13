<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { loadViewerModel, type ViewerModel } from "../features/viewer/viewerService";

const route = useRoute();

const loading = ref(false);
const model = ref<ViewerModel | null>(null);
const screenshotMode = ref(false);
const screenshotVisible = ref(false);
const modeButtonText = ref("仅截图");

const frameSrc = computed(() => {
  if (model.value?.status !== "ready") return "";
  return model.value.target;
});

const openHref = computed(() => {
  if (model.value?.status !== "ready") return "#";
  return model.value.openHref;
});

const hintText = computed(() => {
  if (model.value?.status !== "ready") return "";
  return model.value.hintText;
});

function getRouteParams() {
  const idParam = String(route.params.id || "").trim();
  const idQuery = String(route.query.id || "").trim();
  const builtin = String(route.query.builtin || "").trim();
  const src = String(route.query.src || "").trim();

  return {
    id: idParam || idQuery || builtin,
    builtin,
    src,
  };
}

async function refresh() {
  loading.value = true;
  try {
    const next = await loadViewerModel(getRouteParams());
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
    loading.value = false;
  }
}

function toggleMode() {
  if (model.value?.status !== "ready") return;
  if (!model.value.screenshotUrl) return;

  screenshotMode.value = !screenshotMode.value;
  screenshotVisible.value = screenshotMode.value;
  modeButtonText.value = screenshotMode.value ? "进入交互" : "仅截图";
}

function onFrameLoad() {
  if (model.value?.status !== "ready") return;
  if (screenshotMode.value) return;
  window.setTimeout(() => {
    screenshotVisible.value = false;
  }, 250);
}

onMounted(refresh);
watch(
  () => [route.fullPath],
  () => {
    void refresh();
  },
);
</script>

<template>
  <section class="viewer-page">
    <header class="viewer-bar">
      <div class="viewer-bar-left">
        <RouterLink class="viewer-back" to="/">← 返回</RouterLink>
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
        sandbox="allow-scripts"
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
  display: flex;
  justify-content: space-between;
  align-items: center;
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
}

.viewer-back {
  text-decoration: none;
}

.viewer-title {
  font-weight: 600;
}

.viewer-actions {
  display: flex;
  gap: 8px;
}

.viewer-btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--surface);
  text-decoration: none;
  color: inherit;
  font-size: 13px;
}

.viewer-hint {
  border: 1px dashed var(--border);
  border-radius: 10px;
  color: var(--muted);
  padding: 10px;
  font-size: 13px;
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
  min-height: 70vh;
  border: 0;
  display: block;
  background: #ffffff;
}
</style>
