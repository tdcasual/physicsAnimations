<script setup lang="ts">
  import { ref, onMounted } from 'vue'

  /**
   * PWA 安装提示组件
   *
   * 检测是否可以安装 PWA，并显示安装提示
   */

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }

  const showPrompt = ref(false)
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isInstalled = ref(false)

  onMounted(() => {
    // 检测是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true
      return
    }

    // 监听安装提示事件
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault()
      deferredPrompt.value = e as BeforeInstallPromptEvent
      showPrompt.value = true
    })

    // 监听已安装事件
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      showPrompt.value = false
      deferredPrompt.value = null
    })
  })

  async function installPwa() {
    if (!deferredPrompt.value) return

    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice

    if (outcome === 'accepted') {
      console.log('PWA 安装成功')
    }

    deferredPrompt.value = null
    showPrompt.value = false
  }

  function dismissPrompt() {
    showPrompt.value = false
  }
</script>

<template>
  <Transition name="slide-up">
    <div v-if="showPrompt && !isInstalled" class="pwa-install-prompt" role="alert">
      <div class="pwa-install-content">
        <div class="pwa-install-icon">
          <svg width="48" height="48" viewBox="0 0 512 512" fill="none">
            <rect width="512" height="512" fill="#4f46e5" rx="64" />
            <circle cx="256" cy="213" r="85" fill="none" stroke="white" stroke-width="20" />
            <path
              d="M256 298 L256 384 M192 341 L320 341"
              stroke="white"
              stroke-width="20"
              stroke-linecap="round"
            />
            <circle cx="256" cy="213" r="32" fill="white" />
          </svg>
        </div>
        <div class="pwa-install-text">
          <h3 class="pwa-install-title">安装物理动画演示系统</h3>
          <p class="pwa-install-description">添加到主屏幕，离线也能使用</p>
        </div>
      </div>
      <div class="pwa-install-actions">
        <button
          type="button"
          class="pwa-install-btn pwa-install-btn--secondary"
          @click="dismissPrompt"
        >
          稍后再说
        </button>
        <button type="button" class="pwa-install-btn pwa-install-btn--primary" @click="installPwa">
          安装
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
  .pwa-install-prompt {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    max-width: 480px;
    margin: 0 auto;
    background: var(--surface-page, #ffffff);
    border: 1px solid var(--border-default, #e5e7eb);
    border-radius: 16px;
    padding: 16px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 8px 10px -6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
  }

  .pwa-install-content {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .pwa-install-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    overflow: hidden;
  }

  .pwa-install-icon svg {
    width: 100%;
    height: 100%;
  }

  .pwa-install-text {
    flex: 1;
    min-width: 0;
  }

  .pwa-install-title {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #111827);
  }

  .pwa-install-description {
    margin: 0;
    font-size: 14px;
    color: var(--text-tertiary, #6b7280);
  }

  .pwa-install-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .pwa-install-btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 150ms ease;
  }

  .pwa-install-btn--secondary {
    border: 1px solid var(--border-default, #e5e7eb);
    background: transparent;
    color: var(--text-secondary, #4b5563);
  }

  .pwa-install-btn--secondary:hover {
    background: var(--surface-elevated, #f9fafb);
  }

  .pwa-install-btn--primary {
    border: 1px solid var(--primary-8, #4f46e5);
    background: var(--primary-8, #4f46e5);
    color: white;
  }

  .pwa-install-btn--primary:hover {
    background: var(--primary-9, #4338ca);
    border-color: var(--primary-9, #4338ca);
  }

  /* 动画 */
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition:
      transform 300ms ease,
      opacity 300ms ease;
  }

  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }

  @media (max-width: 640px) {
    .pwa-install-prompt {
      left: 12px;
      right: 12px;
      bottom: 12px;
    }

    .pwa-install-actions {
      flex-direction: column;
    }

    .pwa-install-btn {
      width: 100%;
    }
  }
</style>
