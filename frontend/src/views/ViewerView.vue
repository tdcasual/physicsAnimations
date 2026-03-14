<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { normalizePublicUrl } from "../features/catalog/catalogLink";
import { resolveBackNavigationMode } from "../features/navigation/backNavigation";
import { loadViewerModel, type ViewerModel } from "../features/viewer/viewerService";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const model = ref<ViewerModel | null>(null);
const screenshotMode = ref(false);
const screenshotVisible = ref(false);
const interactiveStarted = ref(true);
const modeButtonText = ref("仅截图");
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

const hintText = computed(() => {
  if (model.value?.status !== "ready") return "";
  return model.value.hintText;
});

const modeStateText = computed(() => {
  if (model.value?.status !== "ready") return "";
  if (!model.value.showModeToggle) return "";
  return screenshotMode.value ? "当前：截图模式" : "当前：交互模式";
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
    if (screenshotVisible.value) return "舞台切换到截图模式";
    if (interactiveStarted.value) {
      return model.value.deferInteractiveStart ? "正在切换到交互预演" : "舞台切换到课堂演示";
    }
    return "舞台切回待命状态";
  }
  if (screenshotVisible.value) return "静态画面已就绪，可先确认版式与完整构图。";
  if (interactiveStarted.value) {
    return model.value.deferInteractiveStart
      ? "当前已进入可操作预演，适合上课前快速试跑关键交互。"
      : "当前处于课堂演示模式，可直接聚焦内容本体。";
  }
  return "舞台保持待命，等待继续进入交互。";
});

const viewerRailStateText = computed(() => {
  if (model.value?.status !== "ready") return "";
  if (modeStateText.value) return modeStateText.value;
  if (screenshotVisible.value) return "当前：讲台截图";
  if (interactiveStarted.value) {
    return model.value.deferInteractiveStart ? "当前：交互预演" : "当前：课堂演示";
  }
  return "当前：待命状态";
});

const viewerRailSupportText = computed(() => {
  if (model.value?.status !== "ready") return "";
  if (screenshotVisible.value) return "先确认完整画面，再决定是否进入交互或跳转原页面。";
  if (model.value.deferInteractiveStart && interactiveStarted.value) {
    return "当前已进入可操作预演，适合上课前快速确认关键交互。";
  }
  if (model.value.deferInteractiveStart) return "这是外链资源，默认保持待命，避免无效加载打断课堂节奏。";
  return "本地或托管内容可直接作为课堂舞台使用。";
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
      document.title = next.title || "作品预览";
      interactiveStarted.value = !next.deferInteractiveStart;
      screenshotMode.value = next.screenshotModeDefault;
      screenshotVisible.value = Boolean(next.screenshotUrl) && screenshotMode.value;
      modeButtonText.value = screenshotMode.value ? "进入交互" : "仅截图";
    } else {
      document.title = next.title || "作品预览";
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

function goBack() {
  if (resolveBackNavigationMode(window.history.state) === "history-back") {
    router.back();
    return;
  }
  void router.replace("/");
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
  <section class="viewer-page">
    <header class="viewer-bar">
      <div class="viewer-bar-left">
        <button type="button" class="viewer-back viewer-btn" @click="goBack">← 返回</button>
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
      </div>
    </header>

    <div v-if="loading" class="viewer-empty">正在加载作品...</div>
    <div v-else-if="model?.status === 'error'" class="viewer-empty">{{ model.message }}</div>

    <div v-else-if="showDeferredFallback" class="viewer-empty viewer-empty--deferred">
      当前无法提供预览截图。你可以直接打开原页面，或手动尝试交互加载该外链。
    </div>

    <section
      v-else-if="model?.status === 'ready'"
      class="viewer-stage-shell"
      :class="['viewer-stage-shell', { 'viewer-stage-shell--screenshot': screenshotVisible, 'viewer-stage-shell--interactive': interactiveStarted && !screenshotVisible }]"
    >
      <aside class="viewer-rail">
        <div class="viewer-rail-block">
          <p class="viewer-rail-label">展示模式</p>
          <div v-if="!loading && model?.status === 'ready' && modeStateText" class="viewer-rail-state">
            {{ modeStateText }}
          </div>
          <div v-else class="viewer-rail-state">{{ viewerRailStateText }}</div>
        </div>

        <div v-if="!loading && model?.status === 'ready' && model.showHint" class="viewer-rail-note">
          {{ hintText }}
        </div>

        <div class="viewer-rail-block viewer-rail-block--support">
          <p class="viewer-rail-label">讲台提示</p>
          <p class="viewer-rail-support">{{ viewerRailSupportText }}</p>
        </div>
      </aside>

      <div class="viewer-stage-column">
        <div class="viewer-stage-caption">
          <p class="viewer-stage-kicker">Presentation Surface</p>
          <p class="viewer-stage-copy">让舞台先占据视线，操作按钮和说明只保留在辅助轨道。</p>
        </div>

        <div
          class="viewer-stage-frame"
          :class="{
            'viewer-stage-frame--screenshot': screenshotVisible,
            'viewer-stage-frame--interactive': interactiveStarted && !screenshotVisible,
            'viewer-stage-frame--transitioning': stageTransitionState === 'mode-shift',
          }"
        >
          <div class="viewer-stage-head">
            <div class="viewer-mode-chip">{{ stageModeLabel }}</div>
            <div class="viewer-transition-note">{{ stageTransitionText }}</div>
          </div>
          <div class="viewer-stage-aura" aria-hidden="true"></div>
          <div class="viewer-stage-veil" aria-hidden="true"></div>
          <div class="viewer-stage-screen">
            <img
              v-if="model.screenshotUrl && screenshotVisible"
              class="viewer-shot"
              :src="normalizePublicUrl(model.screenshotUrl)"
              alt=""
            />
            <iframe
              v-if="interactiveStarted"
              v-show="!screenshotVisible"
              class="viewer-frame"
              :src="frameSrc"
              title="作品"
              loading="eager"
              :sandbox="frameSandbox"
              referrerpolicy="no-referrer"
              @load="onFrameLoad"
            />
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.viewer-page {
  display: grid;
  gap: 16px;
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

.viewer-bar-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  flex: 1 1 auto;
}

.viewer-back {
  text-decoration: none;
}

.viewer-title-block {
  display: grid;
  gap: 4px;
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

.viewer-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
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

.viewer-stage-shell {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.viewer-rail,
.viewer-stage-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--line-strong) 20%, var(--border));
}

.viewer-rail {
  position: sticky;
  top: calc(var(--app-topbar-height, 0px) + 104px);
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 22px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--accent-copper) 10%, var(--surface)), color-mix(in oklab, var(--surface) 94%, var(--paper))),
    var(--surface);
  box-shadow: 0 24px 50px -38px color-mix(in oklab, var(--ink) 26%, transparent);
}

.viewer-rail-block {
  display: grid;
  gap: 6px;
}

.viewer-rail-state {
  font-family: "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(1.1rem, 0.98rem + 0.4vw, 1.45rem);
  line-height: 1.08;
}

.viewer-rail-note,
.viewer-rail-support,
.viewer-stage-copy {
  margin: 0;
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale, 1));
  line-height: 1.6;
}

.viewer-stage-column {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.viewer-stage-caption {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-inline: 4px;
}

.viewer-stage-copy {
  max-width: 36ch;
  text-align: right;
}

.viewer-stage-frame {
  border-radius: 30px;
  padding: clamp(14px, 2.1vw, 22px);
  background:
    radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 42%),
    linear-gradient(180deg, oklch(18% 0.026 255), oklch(13% 0.018 255));
  box-shadow:
    0 34px 76px -44px color-mix(in oklab, var(--ink) 48%, transparent),
    inset 0 1px 0 color-mix(in oklab, var(--paper-strong) 24%, transparent);
}

.viewer-stage-head {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.viewer-mode-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid color-mix(in oklab, var(--accent-copper) 24%, var(--border));
  border-radius: 999px;
  background: color-mix(in oklab, var(--surface) 86%, var(--paper));
  color: color-mix(in oklab, var(--accent-copper-strong) 78%, var(--text));
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.viewer-transition-note {
  max-width: min(34ch, 100%);
  color: color-mix(in oklab, var(--paper-strong) 82%, var(--muted));
  font-size: calc(12px * var(--ui-scale, 1));
  line-height: 1.5;
  text-align: right;
}

.viewer-stage-frame::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 44px;
  background:
    linear-gradient(90deg, color-mix(in oklab, var(--accent-copper) 20%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in oklab, var(--paper-strong) 12%, transparent), transparent);
  pointer-events: none;
}

.viewer-stage-aura,
.viewer-stage-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.viewer-stage-aura {
  background:
    radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--accent) 26%, transparent), transparent 46%),
    radial-gradient(circle at 84% 18%, color-mix(in oklab, var(--accent-copper) 14%, transparent), transparent 28%);
  opacity: 0.42;
  animation: viewer-stage-glow 5.2s ease-in-out infinite;
}

.viewer-stage-veil {
  background:
    linear-gradient(180deg, color-mix(in oklab, oklch(12% 0.01 255) 68%, transparent), transparent 24%),
    linear-gradient(180deg, color-mix(in oklab, var(--paper-strong) 10%, transparent), transparent 42%);
  opacity: 0.18;
  transition: opacity 220ms ease;
}

.viewer-stage-screen {
  position: relative;
  z-index: 3;
  min-height: calc(var(--viewer-min-height, 70vh) - clamp(28px, 4.2vw, 44px));
  border-radius: 20px;
  overflow: hidden;
  background: oklch(14% 0.018 255);
}

.viewer-stage-shell--interactive .viewer-stage-frame {
  box-shadow:
    0 38px 84px -46px color-mix(in oklab, var(--accent) 22%, transparent),
    inset 0 1px 0 color-mix(in oklab, var(--paper-strong) 20%, transparent);
}

.viewer-stage-shell--screenshot .viewer-stage-frame {
  background:
    linear-gradient(180deg, oklch(17% 0.02 255), oklch(13% 0.016 255)),
    linear-gradient(180deg, oklch(19% 0.02 255), oklch(14% 0.015 255));
}

.viewer-stage-frame--transitioning {
  animation: viewer-stage-shift 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.viewer-stage-frame--interactive .viewer-stage-aura {
  opacity: 0.7;
}

.viewer-shot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: oklch(14% 0.018 255);
  z-index: 2;
}

.viewer-stage-frame--screenshot .viewer-stage-screen {
  min-height: 0;
}

.viewer-stage-frame--screenshot .viewer-shot {
  position: static;
  inset: auto;
  display: block;
  width: 100%;
  height: auto;
}

.viewer-stage-frame--screenshot .viewer-stage-veil {
  opacity: 1;
}

.viewer-frame {
  width: 100%;
  min-height: calc(var(--viewer-min-height, 70vh) - clamp(28px, 4.2vw, 44px));
  border: 0;
  display: block;
  background: var(--surface);
}

@keyframes viewer-stage-glow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.36;
  }

  50% {
    transform: scale(1.04);
    opacity: 0.68;
  }
}

@keyframes viewer-stage-shift {
  from {
    transform: translateY(12px) scale(0.985);
  }

  to {
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 900px) {
  .viewer-stage-shell {
    grid-template-columns: 1fr;
  }

  .viewer-rail {
    position: static;
  }
}

@media (max-width: 640px) {
  .viewer-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .viewer-stage-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .viewer-transition-note {
    text-align: left;
  }

  .viewer-stage-caption {
    align-items: flex-start;
    flex-direction: column;
  }

  .viewer-stage-copy {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .viewer-stage-frame--transitioning,
  .viewer-stage-aura {
    animation: none;
  }

  .viewer-stage-veil,
  .viewer-mode-chip,
  .viewer-transition-note {
    transition: none;
  }
}
</style>
