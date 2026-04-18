<script setup lang="ts">
import { computed, ref } from "vue";

import AdminMobileSheet from "./AdminMobileSheet.vue";

defineProps<{
  editorOpen: boolean;
  editorTitle?: string;
  gap?: string;
}>();

const emit = defineEmits<{ "close-editor": [] }>();

const sheetRef = ref<{ panelRef: HTMLElement | null } | null>(null);
const panelRef = computed(() => sheetRef.value?.panelRef ?? null);

defineExpose({ panelRef });
</script>

<template>
  <section class="admin-split-layout">
    <slot name="header" />
    <div class="admin-split-layout__grid">
      <div class="admin-split-layout__list">
        <slot name="list" />
      </div>
      <AdminMobileSheet
        ref="sheetRef"
        :open="editorOpen"
        as="aside"
        panel-class="admin-split-layout__editor admin-mobile-focus-anchor"
        :backdrop-label="editorTitle || '关闭编辑抽屉'"
        @close="emit('close-editor')"
      >
        <slot name="editor" />
      </AdminMobileSheet>
    </div>
  </section>
</template>

<style scoped>
.admin-split-layout {
  display: grid;
  gap: v-bind("gap || '20px'");
}

.admin-split-layout__grid {
  display: grid;
  gap: 20px;
}

.admin-split-layout__list,
.admin-split-layout__editor {
  align-content: start;
}

.admin-split-layout__editor {
  position: sticky;
  align-self: start;
  top: calc(var(--app-topbar-height, 64px) + 12px);
  max-height: calc(100dvh - var(--app-topbar-height, 64px) - 32px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.admin-mobile-focus-anchor {
  scroll-margin-top: calc(var(--app-topbar-height, 64px) + 16px);
}

@media (max-width: 1024px) {
  .admin-split-layout__editor {
    position: static;
    top: auto;
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 640px) {
  .admin-split-layout {
    gap: 16px;
  }
}
</style>
