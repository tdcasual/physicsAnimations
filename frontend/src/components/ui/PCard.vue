<script setup lang="ts">
  interface Props {
    hoverable?: boolean
    padding?: 'none' | 'sm' | 'md' | 'lg'
    variant?: 'elevated' | 'outlined' | 'flat'
    borderRadius?: 'sm' | 'md' | 'lg' | 'xl'
  }

  const props = withDefaults(defineProps<Props>(), {
    padding: 'md',
    hoverable: false,
    variant: 'elevated',
    borderRadius: 'md',
  })
</script>

<template>
  <div 
    :class="[
      'p-card', 
      `p-card--padding-${padding}`,
      `p-card--variant-${variant}`,
      `p-card--radius-${borderRadius}`,
      { 'p-card--hoverable': hoverable }
    ]"
  >
    <slot />
  </div>
</template>

<style scoped>
  .p-card {
    background: var(--surface-card);
    transition: all var(--duration-normal) var(--ease-smooth);
    position: relative;
    overflow: hidden;
  }

  /* Border Radius Variants */
  .p-card--radius-sm {
    border-radius: var(--radius-sm);
  }
  .p-card--radius-md {
    border-radius: var(--radius-md);
  }
  .p-card--radius-lg {
    border-radius: var(--radius-lg);
  }
  .p-card--radius-xl {
    border-radius: var(--radius-xl);
  }

  /* Padding Variants */
  .p-card--padding-none {
    padding: 0;
  }
  .p-card--padding-sm {
    padding: var(--space-3);
  }
  .p-card--padding-md {
    padding: var(--space-4);
  }
  .p-card--padding-lg {
    padding: var(--space-6);
  }

  /* Style Variants */
  .p-card--variant-elevated {
    box-shadow: var(--shadow-sm);
    border: 1px solid transparent;
  }

  .p-card--variant-outlined {
    box-shadow: none;
    border: 1px solid var(--border-default);
  }

  .p-card--variant-flat {
    box-shadow: none;
    border: 1px solid transparent;
    background: var(--surface-page);
  }

  /* Hoverable State */
  .p-card--hoverable {
    cursor: pointer;
  }

  .p-card--hoverable:hover {
    transform: translateY(-3px);
  }

  .p-card--variant-elevated.p-card--hoverable:hover {
    box-shadow: var(--shadow-lg);
    border-color: var(--border-subtle);
  }

  .p-card--variant-outlined.p-card--hoverable:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--border-strong);
  }

  .p-card--variant-flat.p-card--hoverable:hover {
    background: var(--surface-card);
    box-shadow: var(--shadow-sm);
  }

  .p-card--hoverable:active {
    transform: translateY(-1px);
    transition-duration: var(--duration-fast);
  }

  .p-card--variant-elevated.p-card--hoverable:active {
    box-shadow: var(--shadow-md);
  }

  /* Focus state for accessibility */
  .p-card--hoverable:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  /* Loading state overlay */
  .p-card--loading::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--surface-page) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Dark mode adjustments */
  :root[data-theme='dark'] .p-card--variant-elevated {
    box-shadow: var(--shadow-sm);
    background: var(--surface-card);
  }

  :root[data-theme='dark'] .p-card--variant-elevated.p-card--hoverable:hover {
    box-shadow: var(--shadow-lg);
    border-color: var(--border-default);
  }

  :root[data-theme='dark'] .p-card--variant-flat {
    background: var(--surface-panel);
  }

  :root[data-theme='dark'] .p-card--variant-flat.p-card--hoverable:hover {
    background: var(--surface-card);
  }
</style>
