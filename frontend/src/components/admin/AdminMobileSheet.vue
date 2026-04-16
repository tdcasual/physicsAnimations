<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { PACard } from "@/components/ui/patterns";
import { cn } from "@/lib/utils";

const panelRef = ref<HTMLElement | null>(null);
defineExpose({ panelRef });

const props = defineProps<{
  open: boolean;
  as?: "div" | "form" | "article" | "aside" | "section";
  backdropLabel?: string;
  panelClass?: string;
  bodyScrollLock?: boolean;
}>();

const emit = defineEmits<{ close: [] }>();

let bodyOverflowBeforeSheet = "";

watch(
  () => props.open,
  (open) => {
    if (!props.bodyScrollLock && props.bodyScrollLock !== undefined) return;

    const shouldLock = props.bodyScrollLock ?? true;
    if (open && shouldLock && isMobileSheetViewport()) {
      bodyOverflowBeforeSheet = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return;
    }

    document.body.style.overflow = bodyOverflowBeforeSheet;
    bodyOverflowBeforeSheet = "";
  }
);

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflowBeforeSheet;
});

function isMobileSheetViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 640px)").matches;
}
</script>

<template>
  <button
    v-if="open"
    type="button"
    class="admin-mobile-sheet-backdrop"
    :aria-label="backdropLabel || '关闭'"
    @click="emit('close')"
  />
  <PACard
    variant="admin"
    :as="as || 'aside'"
    :class="cn('admin-mobile-sheet', panelClass, open && 'is-open')"
  >
    <div ref="panelRef" class="admin-mobile-sheet-inner">
      <slot />
    </div>
  </PACard>
</template>

<style scoped>
.admin-mobile-sheet-backdrop {
  display: none;
}

.admin-mobile-sheet {
  align-content: start;
}

@media (max-width: 640px) {
  .admin-mobile-sheet-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-modal) - 2);
    border: 0;
    padding: 0;
    background: color-mix(in oklab, var(--foreground) 32%, transparent);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .admin-mobile-sheet {
    position: fixed;
    left: 14px;
    right: 14px;
    bottom: 0;
    top: auto;
    z-index: calc(var(--z-modal) - 1);
    max-height: min(78dvh, 720px);
    overflow: auto;
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -24px 56px -24px color-mix(in oklab, var(--foreground) 20%, transparent);
    transform: translateY(calc(100% + 16px));
    transition: transform 200ms ease;
    pointer-events: none;
  }

  .admin-mobile-sheet.is-open {
    transform: translateY(0);
    pointer-events: auto;
  }
}
</style>
