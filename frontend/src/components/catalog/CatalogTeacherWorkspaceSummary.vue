<script setup lang="ts">
defineProps<{
  summary: Array<{
    label: string;
    value: string;
    note: string;
  }>;
}>();
</script>

<template>
  <div class="catalog-workspace-strip" aria-label="教学工作区摘要">
    <article v-for="item in summary" :key="item.label" class="catalog-workspace-item">
      <span class="catalog-workspace-label">{{ item.label }}</span>
      <strong class="catalog-workspace-value">{{ item.value }}</strong>
      <span class="catalog-workspace-note">{{ item.note }}</span>
    </article>
  </div>
</template>

<style scoped>
.catalog-workspace-strip {
  display: grid;
  gap: 8px;
}

.catalog-workspace-item {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.catalog-workspace-item + .catalog-workspace-item {
  padding-top: 8px;
  border-top: 1px solid color-mix(in oklab, var(--line-strong) 10%, var(--border));
}

.catalog-workspace-label,
.catalog-workspace-note {
  color: var(--muted);
}

.catalog-workspace-value {
  font-size: calc(15px * var(--ui-scale, 1));
  line-height: 1.18;
}

.catalog-workspace-note {
  font-size: calc(12px * var(--ui-scale, 1));
  line-height: 1.45;
}

@media (min-width: 760px) {
  .catalog-workspace-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 14px;
  }

  .catalog-workspace-item + .catalog-workspace-item {
    padding-top: 0;
    padding-inline-start: 14px;
    border-top: 0;
    border-inline-start: 1px solid color-mix(in oklab, var(--line-strong) 10%, var(--border));
  }
}
</style>
