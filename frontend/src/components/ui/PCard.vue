<script setup lang="ts">
interface Props {
  hoverable?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  padding: 'md',
  hoverable: false
})
</script>

<template>
  <div
    :class="[
      'p-card',
      `p-card--padding-${padding}`,
      { 'p-card--hoverable': hoverable }
    ]"
  >
    <slot />
  </div>
</template>

<style scoped>
.p-card {
  background: var(--surface-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: 
    box-shadow var(--duration-normal) var(--ease-smooth),
    transform var(--duration-normal) var(--ease-smooth);
}

.p-card--padding-none { padding: 0; }
.p-card--padding-sm { padding: var(--space-3); }
.p-card--padding-md { padding: var(--space-4); }
.p-card--padding-lg { padding: var(--space-6); }

.p-card--hoverable {
  cursor: pointer;
}
.p-card--hoverable:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.p-card--hoverable:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
</style>
