<script setup lang="ts">
  export type ErrorStateType = 'network' | 'empty' | 'permission' | 'not-found' | 'general'

  interface Props {
    type?: ErrorStateType
    title?: string
    description?: string
    actionText?: string
    showAction?: boolean
    showRetry?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    type: 'general',
    showAction: true,
    showRetry: false,
  })

  const emit = defineEmits<{
    (e: 'action'): void
    (e: 'retry'): void
  }>()

  const errorConfig: Record<ErrorStateType, { icon: string; defaultTitle: string; defaultDesc: string }> = {
    network: {
      icon: '📡',
      defaultTitle: '网络连接失败',
      defaultDesc: '请检查网络连接后重试，或联系管理员获取帮助',
    },
    empty: {
      icon: '📭',
      defaultTitle: '暂无内容',
      defaultDesc: '当前列表为空，添加一些内容后开始使用',
    },
    permission: {
      icon: '🔒',
      defaultTitle: '权限不足',
      defaultDesc: '您没有访问此内容的权限，请联系管理员',
    },
    'not-found': {
      icon: '🔍',
      defaultTitle: '页面未找到',
      defaultDesc: '您访问的内容不存在或已被移除',
    },
    general: {
      icon: '⚠️',
      defaultTitle: '出错了',
      defaultDesc: '操作失败，请稍后重试',
    },
  }

  const config = errorConfig[props.type]
  const displayTitle = props.title ?? config.defaultTitle
  const displayDescription = props.description ?? config.defaultDesc
</script>

<template>
  <div class="error-state" :class="`error-state--${type}`" role="alert" aria-live="polite">
    <div class="error-state-illustration">
      <span class="error-state-icon">{{ config.icon }}</span>
      <div class="error-state-orb orb-1"></div>
      <div class="error-state-orb orb-2"></div>
      <div class="error-state-orb orb-3"></div>
    </div>
    <h2 class="error-state-title">{{ displayTitle }}</h2>
    <p class="error-state-description">{{ displayDescription }}</p>
    <div v-if="showAction || showRetry" class="error-state-actions">
      <button v-if="showRetry" class="error-btn error-btn--primary" @click="emit('retry')">
        <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
        </svg>
        重试
      </button>
      <button v-if="showAction && actionText" class="error-btn" :class="showRetry ? 'error-btn--secondary' : 'error-btn--primary'" @click="emit('action')">
        {{ actionText }}
      </button>
    </div>
  </div>
</template>

<style scoped>
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-10) var(--space-6);
    max-width: 480px;
    margin: 0 auto;
  }

  .error-state-illustration {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-6);
  }

  .error-state-icon {
    font-size: 56px;
    z-index: 2;
    animation: error-icon-float 3s ease-in-out infinite;
  }

  @keyframes error-icon-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .error-state-orb {
    position: absolute;
    border-radius: 50%;
    opacity: 0.6;
    animation: error-orb-pulse 2s ease-in-out infinite;
  }

  .orb-1 {
    width: 80px;
    height: 80px;
    background: var(--primary-subtle);
    top: 10px;
    left: 5px;
    animation-delay: 0s;
  }

  .orb-2 {
    width: 60px;
    height: 60px;
    background: var(--accent-subtle);
    bottom: 15px;
    right: 10px;
    animation-delay: 0.5s;
  }

  .orb-3 {
    width: 40px;
    height: 40px;
    background: var(--surface-panel);
    top: 50%;
    right: 0;
    animation-delay: 1s;
  }

  @keyframes error-orb-pulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.1); opacity: 0.3; }
  }

  .error-state-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin: 0 0 var(--space-3);
  }

  .error-state-description {
    font-size: var(--text-base);
    color: var(--text-tertiary);
    margin: 0 0 var(--space-6);
    line-height: var(--leading-relaxed);
  }

  .error-state-actions {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
    justify-content: center;
  }

  .error-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2_5) var(--space-5);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--surface-card);
    font-family: inherit;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
    min-height: 44px;
  }

  .error-btn:hover {
    border-color: var(--border-strong);
    background: var(--surface-panel);
  }

  .error-btn--primary {
    background: var(--primary-default);
    border-color: var(--primary-default);
    color: white;
  }

  .error-btn--primary:hover {
    background: var(--primary-hover);
    border-color: var(--primary-hover);
  }

  .error-btn--secondary {
    background: transparent;
    border-color: var(--border-default);
  }

  .btn-icon {
    width: 18px;
    height: 18px;
  }

  /* Variants */
  .error-state--network .orb-1 { background: var(--warning-subtle); }
  .error-state--network .orb-2 { background: var(--danger-subtle); }
  
  .error-state--empty .orb-1 { background: var(--success-subtle); }
  .error-state--empty .orb-2 { background: var(--primary-subtle); }
  
  .error-state--permission .orb-1 { background: var(--danger-subtle); }
  .error-state--permission .orb-2 { background: var(--warning-subtle); }

  /* Responsive */
  @media (max-width: 640px) {
    .error-state {
      padding: var(--space-8) var(--space-4);
    }

    .error-state-illustration {
      width: 100px;
      height: 100px;
    }

    .error-state-icon {
      font-size: 44px;
    }

    .error-state-title {
      font-size: var(--text-lg);
    }

    .error-state-description {
      font-size: var(--text-sm);
    }

    .error-state-actions {
      flex-direction: column;
      width: 100%;
    }

    .error-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
