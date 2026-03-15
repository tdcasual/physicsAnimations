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
  <section class="catalog-workspace-summary" aria-label="教学工作区">
    <div class="catalog-workspace-heading">
      <p class="catalog-workspace-kicker">教学工作区</p>
      <p class="catalog-workspace-copy">先确认最近课堂入口和已固定演示，再决定是否继续深入当前目录。</p>
    </div>
    <div class="catalog-workspace-grid">
      <article v-for="item in summary" :key="item.label" class="catalog-workspace-card">
        <span class="catalog-workspace-label">{{ item.label }}</span>
        <strong class="catalog-workspace-value">{{ item.value }}</strong>
        <span class="catalog-workspace-note">{{ item.note }}</span>
      </article>
    </div>
  </section>
</template>

<style scoped>
.catalog-workspace-summary {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 20px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface) 94%, var(--paper)), color-mix(in oklab, var(--accent) 6%, var(--surface))),
    var(--surface);
}

.catalog-workspace-heading {
  display: grid;
  gap: 4px;
}

.catalog-workspace-kicker {
  margin: 0;
  color: color-mix(in oklab, var(--accent-copper-strong) 78%, var(--text));
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.catalog-workspace-copy {
  margin: 0;
  color: var(--muted);
}

.catalog-workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.catalog-workspace-card {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid color-mix(in oklab, var(--line-strong) 14%, var(--border));
  border-radius: 16px;
  background: color-mix(in oklab, var(--surface) 88%, var(--paper));
}

.catalog-workspace-label,
.catalog-workspace-note {
  color: var(--muted);
}

.catalog-workspace-value {
  font-size: calc(18px * var(--ui-scale, 1));
  line-height: 1.2;
}
</style>
