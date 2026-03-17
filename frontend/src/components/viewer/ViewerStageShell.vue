<script setup lang="ts">
const props = defineProps<{
  screenshotVisible: boolean;
  interactiveStarted: boolean;
  stageStatusLabel: string;
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
    :class="{ 'viewer-stage-shell--screenshot': props.screenshotVisible, 'viewer-stage-shell--interactive': props.interactiveStarted && !props.screenshotVisible }"
  >
    <div
      class="viewer-stage-frame viewer-stage-frame--priority"
      :class="{
        'viewer-stage-frame--screenshot': props.screenshotVisible,
        'viewer-stage-frame--interactive': props.interactiveStarted && !props.screenshotVisible,
        'viewer-stage-frame--transitioning': props.stageTransitionState === 'mode-shift',
      }"
    >
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
  </section>
</template>

<style scoped>
.viewer-stage-shell {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.viewer-stage-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: clamp(14px, 2vw, 20px);
  background: oklch(14% 0.02 250);
}

.viewer-stage-screen {
  position: relative;
  min-height: calc(var(--viewer-min-height, 72vh) - clamp(28px, 4vw, 40px));
  border-radius: var(--radius-m);
  overflow: hidden;
  background: oklch(12% 0.015 250);
}

.viewer-stage-shell--interactive .viewer-stage-frame {
  box-shadow: var(--shadow-xl);
}

.viewer-stage-shell--screenshot .viewer-stage-frame {
  background: oklch(15% 0.015 250);
}

.viewer-stage-frame--transitioning {
  animation: viewer-shift 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.viewer-shot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: oklch(12% 0.015 250);
  z-index: var(--z-raised);
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

.viewer-frame {
  width: 100%;
  min-height: calc(var(--viewer-min-height, 72vh) - clamp(28px, 4vw, 40px));
  border: 0;
  display: block;
  background: var(--surface);
}

@keyframes viewer-shift {
  from { transform: translateY(8px) scale(0.99); }
  to { transform: translateY(0) scale(1); }
}

@media (max-width: 640px) {
  .viewer-stage-frame--priority {
    padding: 10px;
    border-radius: var(--radius-l);
  }
}

@media (prefers-reduced-motion: reduce) {
  .viewer-stage-frame--transitioning { animation: none; }
}
</style>
