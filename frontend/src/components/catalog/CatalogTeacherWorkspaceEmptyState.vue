<script setup lang="ts">
defineProps<{
  title: string;
  copy: string;
}>();
</script>

<template>
  <div class="catalog-teacher-empty">
    <strong>{{ title }}</strong>
    <span>{{ copy }}</span>
  </div>
</template>

<style scoped>
.catalog-teacher-empty {
  display: grid;
  gap: 6px;
  min-height: 136px;
  padding: 18px;
  border: 1px dashed color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 18px;
  background: color-mix(in oklab, var(--surface) 84%, var(--paper));
  color: var(--muted);
  align-content: start;
}

.catalog-teacher-empty strong {
  color: var(--text);
}
</style>
