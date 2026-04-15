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
    class="relative w-full rounded-2xl border border-border bg-muted/50 p-3 shadow-sm transition-all"
    :class="{
      'shadow-lg': props.interactiveStarted && !props.screenshotVisible,
    }"
  >
    <div
      class="relative overflow-hidden rounded-xl"
      :class="{
        'animate-mode-shift': props.stageTransitionState === 'mode-shift',
      }"
    >
      <div
        class="relative min-h-[60vh] overflow-hidden rounded-xl bg-background sm:min-h-[72vh]"
      >
        <img
          v-if="props.screenshotUrl && props.screenshotVisible"
          class="absolute inset-0 z-10 h-full w-full object-contain"
          :src="props.normalizedScreenshotSrc"
          alt=""
        />
        <iframe
          v-if="props.interactiveStarted"
          v-show="!props.screenshotVisible"
          class="block min-h-[60vh] w-full border-0 bg-white sm:min-h-[72vh]"
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
@keyframes mode-shift {
  from { transform: translateY(8px) scale(0.99); opacity: 0.8; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.animate-mode-shift {
  animation: mode-shift 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .animate-mode-shift { animation: none; }
}
</style>
