<script setup lang="ts">
defineProps<{
  title: string;
  copy: string;
}>();
</script>

<template>
  <div class="catalog-teacher-empty catalog-teacher-empty--compact catalog-teacher-empty--inline">
    <strong>{{ title }}</strong>
    <span v-if="copy">{{ copy }}</span>
  </div>
</template>

<style scoped>
.catalog-teacher-empty {
  display: grid;
  gap: 2px;
  padding: 10px 0 0;
  border-top: 1px dashed color-mix(in oklab, var(--line-strong) 18%, var(--border));
  background: transparent;
  color: var(--muted);
  align-content: start;
}

.catalog-teacher-empty--compact {
  min-height: 0;
}

.catalog-teacher-empty--inline {
  border-inline: 0;
  border-bottom: 0;
  border-radius: 0;
}

.catalog-teacher-empty strong {
  color: var(--text);
  font-size: calc(13px * var(--ui-scale, 1));
  line-height: 1.25;
}

.catalog-teacher-empty span {
  font-size: calc(12px * var(--ui-scale, 1));
  line-height: 1.45;
}
</style>
