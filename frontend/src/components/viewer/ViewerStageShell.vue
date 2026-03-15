<script setup lang="ts">
const props = defineProps<{
  screenshotVisible: boolean;
  interactiveStarted: boolean;
  modeStateText: string;
  viewerRailStateText: string;
  showHint: boolean;
  hintText: string;
  viewerRailSupportText: string;
  stageModeLabel: string;
  stageTransitionText: string;
  screenshotUrl: string;
  normalizedScreenshotSrc: string;
  frameSrc: string;
  frameSandbox: string;
  stageTransitionState: "steady" | "mode-shift";
}>();

const emit = defineEmits<{
  (event: "frame-load"): void;
}>();
</script>

<template>
  <section
    class="viewer-stage-shell"
    :class="['viewer-stage-shell', { 'viewer-stage-shell--screenshot': props.screenshotVisible, 'viewer-stage-shell--interactive': props.interactiveStarted && !props.screenshotVisible }]"
  >
    <aside class="viewer-rail">
      <div class="viewer-rail-block">
        <p class="viewer-rail-label">展示模式</p>
        <div v-if="props.modeStateText" class="viewer-rail-state">
          {{ props.modeStateText }}
        </div>
        <div v-else class="viewer-rail-state">{{ props.viewerRailStateText }}</div>
      </div>

      <div v-if="props.showHint" class="viewer-rail-note">
        {{ props.hintText }}
      </div>

      <div class="viewer-rail-block viewer-rail-block--support">
        <p class="viewer-rail-label">讲台提示</p>
        <p class="viewer-rail-support">{{ props.viewerRailSupportText }}</p>
      </div>
    </aside>

    <div class="viewer-stage-column">
      <div class="viewer-stage-proscenium">
        <div class="viewer-stage-caption">
          <p class="viewer-stage-kicker">Presentation Surface</p>
          <p class="viewer-stage-copy">让舞台先占据视线，操作按钮和说明只保留在辅助轨道。</p>
        </div>

        <div
          class="viewer-stage-frame"
          :class="{
            'viewer-stage-frame--screenshot': props.screenshotVisible,
            'viewer-stage-frame--interactive': props.interactiveStarted && !props.screenshotVisible,
            'viewer-stage-frame--transitioning': props.stageTransitionState === 'mode-shift',
          }"
        >
          <div class="viewer-stage-head">
            <div class="viewer-mode-chip">{{ props.stageModeLabel }}</div>
            <div class="viewer-transition-note">{{ props.stageTransitionText }}</div>
          </div>
          <div class="viewer-stage-aura" aria-hidden="true"></div>
          <div class="viewer-stage-veil" aria-hidden="true"></div>
          <div class="viewer-stage-screen">
            <img
              v-if="props.screenshotUrl && props.screenshotVisible"
              class="viewer-shot"
              :src="props.normalizedScreenshotSrc"
              alt=""
            />
            <iframe
              v-if="props.interactiveStarted"
              v-show="!props.screenshotVisible"
              class="viewer-frame"
              :src="props.frameSrc"
              title="作品"
              loading="eager"
              :sandbox="props.frameSandbox"
              referrerpolicy="no-referrer"
              @load="emit('frame-load')"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
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

.viewer-rail-label,
.viewer-stage-kicker {
  margin: 0;
  color: color-mix(in oklab, var(--accent-copper-strong) 72%, var(--text));
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
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

.viewer-stage-proscenium {
  position: relative;
  display: grid;
  gap: 12px;
  padding: clamp(8px, 1.4vw, 14px);
  border: 1px solid color-mix(in oklab, var(--accent) 12%, var(--border));
  border-radius: 30px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--paper-strong) 28%, transparent), transparent 26%),
    color-mix(in oklab, var(--surface) 42%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in oklab, var(--paper-strong) 22%, transparent);
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
