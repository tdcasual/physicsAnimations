<script setup lang="ts">
  import { useOnline } from '../composables/useOnline'

  /**
   * 离线状态指示器
   *
   * 显示当前网络连接状态
   */
  const isOnline = useOnline()
</script>

<template>
  <Transition name="slide-down">
    <div v-if="!isOnline" class="offline-indicator" role="alert">
      <svg
        class="offline-icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <span class="offline-text">当前处于离线状态</span>
    </div>
  </Transition>
</template>

<style scoped>
  .offline-indicator {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--danger-9, #dc2626);
    color: white;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
  }

  .offline-icon {
    flex-shrink: 0;
  }

  .offline-text {
    line-height: 1.5;
  }

  /* 动画 */
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition:
      transform 300ms ease,
      opacity 300ms ease;
  }

  .slide-down-enter-from,
  .slide-down-leave-to {
    transform: translateY(-100%);
    opacity: 0;
  }

  /* 适配有 topbar 的布局 */
  :global(.has-topbar) .offline-indicator {
    top: var(--app-topbar-height, 64px);
  }
</style>
