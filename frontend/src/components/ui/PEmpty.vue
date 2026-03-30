<script setup lang="ts">
interface Props {
  description?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  description: '暂无数据',
  size: 'md'
})
</script>

<template>
  <div class="p-empty" :class="`p-empty--${size}`">
    <div class="p-empty__image">
      <slot name="image">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="12" width="40" height="40" rx="8" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
          <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.3"/>
          <circle cx="40" cy="24" r="4" fill="currentColor" opacity="0.3"/>
          <circle cx="24" cy="40" r="4" fill="currentColor" opacity="0.3"/>
          <circle cx="40" cy="40" r="4" fill="currentColor" opacity="0.3"/>
        </svg>
      </slot>
    </div>
    <div class="p-empty__description">{{ description }}</div>
    <div v-if="$slots.action" class="p-empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.p-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.p-empty--sm { padding: var(--space-6); }
.p-empty--md { padding: var(--space-10); }
.p-empty--lg { padding: var(--space-12); }

.p-empty__image {
  color: var(--gray-5);
  margin-bottom: var(--space-4);
}

.p-empty--sm .p-empty__image { width: 48px; height: 48px; }
.p-empty--md .p-empty__image { width: 64px; height: 64px; }
.p-empty--lg .p-empty__image { width: 80px; height: 80px; }

.p-empty__description {
  font-size: var(--text-base);
  color: var(--text-secondary);
}

.p-empty__action {
  margin-top: var(--space-5);
}
</style>
