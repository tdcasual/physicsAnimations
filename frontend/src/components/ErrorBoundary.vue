<script setup lang="ts">
  import { ref, onErrorCaptured } from 'vue'
  import { captureException } from '../monitoring/sentry'

  /**
   * 错误边界组件
   *
   * 捕获子组件的错误，防止应用崩溃
   */
  const hasError = ref(false)
  const errorMessage = ref('')

  onErrorCaptured((err, instance, info) => {
    hasError.value = true
    errorMessage.value = err instanceof Error ? err.message : '未知错误'

    // 上报错误
    captureException(err instanceof Error ? err : new Error(String(err)), {
      component: instance?.$options?.name || 'unknown',
      errorInfo: info,
    })

    // 阻止错误继续传播
    return false
  })

  function retry() {
    hasError.value = false
    errorMessage.value = ''
  }
</script>

<template>
  <div v-if="hasError" class="error-boundary" role="alert">
    <div class="error-content">
      <svg
        class="error-icon"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3 class="error-title">出错了</h3>
      <p class="error-message">{{ errorMessage }}</p>
      <button type="button" class="error-retry" @click="retry"> 重试 </button>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
  .error-boundary {
    padding: 24px;
    text-align: center;
  }

  .error-content {
    max-width: 400px;
    margin: 0 auto;
    padding: 32px;
    background: var(--danger-1, #fef2f2);
    border: 1px solid var(--danger-3, #fecaca);
    border-radius: 12px;
  }

  .error-icon {
    color: var(--danger-8, #dc2626);
    margin-bottom: 16px;
  }

  .error-title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
    color: var(--danger-9, #b91c1c);
  }

  .error-message {
    margin: 0 0 16px;
    font-size: 14px;
    color: var(--danger-7, #ef4444);
  }

  .error-retry {
    padding: 8px 16px;
    background: var(--danger-8, #dc2626);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 150ms ease;
  }

  .error-retry:hover {
    background: var(--danger-9, #b91c1c);
  }
</style>
