<script setup lang="ts">
  interface Props {
    description?: string
    size?: 'sm' | 'md' | 'lg'
  }

  const props = withDefaults(defineProps<Props>(), {
    description: '暂无数据',
    size: 'md',
  })
</script>

<template>
  <div class="p-empty" :class="`p-empty--${size}`">
    <div class="p-empty__image">
      <slot name="image">
        <div class="empty-illustration">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background shape -->
            <rect
              x="12"
              y="12"
              width="40"
              height="40"
              rx="8"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray="4 4"
              opacity="0.4"
            />
            <!-- Content dots -->
            <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.2" />
            <circle cx="40" cy="24" r="4" fill="currentColor" opacity="0.2" />
            <circle cx="24" cy="40" r="4" fill="currentColor" opacity="0.2" />
            <circle cx="40" cy="40" r="4" fill="currentColor" opacity="0.2" />
            <!-- Center question mark -->
            <text 
              x="32" 
              y="36" 
              text-anchor="middle" 
              font-size="20" 
              fill="currentColor" 
              opacity="0.3"
              font-weight="bold"
            >?</text>
          </svg>
        </div>
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
    text-align: center;
  }

  .p-empty--sm {
    padding: var(--space-6);
  }
  .p-empty--md {
    padding: var(--space-10);
  }
  .p-empty--lg {
    padding: var(--space-12);
  }

  .empty-illustration {
    color: var(--gray-5);
    transition: color var(--duration-normal) var(--ease-smooth);
  }

  .p-empty:hover .empty-illustration {
    color: var(--gray-6);
  }

  .p-empty__image {
    margin-bottom: var(--space-4);
  }

  .p-empty--sm .p-empty__image {
    width: 48px;
    height: 48px;
  }
  .p-empty--md .p-empty__image {
    width: 64px;
    height: 64px;
  }
  .p-empty--lg .p-empty__image {
    width: 80px;
    height: 80px;
  }

  .p-empty__description {
    font-size: var(--text-base);
    color: var(--text-secondary);
    line-height: var(--leading-relaxed);
    max-width: 280px;
  }

  .p-empty__action {
    margin-top: var(--space-5);
  }

  /* Dark mode adjustments */
  :root[data-theme='dark'] .empty-illustration {
    color: var(--gray-7);
  }

  :root[data-theme='dark'] .p-empty:hover .empty-illustration {
    color: var(--gray-6);
  }

  :root[data-theme='dark'] .p-empty__description {
    color: var(--text-secondary);
  }
</style>
