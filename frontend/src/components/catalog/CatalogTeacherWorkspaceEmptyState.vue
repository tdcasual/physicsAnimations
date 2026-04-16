<script setup lang="ts">
defineProps<{
  title: string;
  hint?: string;
}>();
</script>

<template>
  <div class="catalog-teacher-empty catalog-teacher-empty--compact catalog-teacher-empty--inline">
    <strong>{{ title }}</strong>
    <span v-if="hint" class="catalog-teacher-empty-hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.catalog-teacher-empty {
  display: grid;
  gap: 2px;
  padding: 10px 0 0;
  border-top: 1px dashed var(--border);
  background: transparent;
  color: var(--muted-foreground);
  align-content: center;
  justify-items: center;
  text-align: center;
  min-height: 80px;
}

.catalog-teacher-empty--compact {
  min-height: 60px;
}

.catalog-teacher-empty--inline {
  border-inline: 0;
  border-bottom: 0;
  border-radius: 0;
}

.catalog-teacher-empty strong {
  color: var(--foreground);
  font-size: calc(13px * var(--ui-scale, 1));
  line-height: 1.25;
}

.catalog-teacher-empty-hint {
  font-size: calc(12px * var(--ui-scale, 1));
  line-height: 1.45;
}

@media (max-width: 640px) {
  .catalog-teacher-empty {
    min-height: 48px;
    padding-top: 8px;
    align-content: start;
    justify-items: start;
    text-align: left;
  }
}

</style>
