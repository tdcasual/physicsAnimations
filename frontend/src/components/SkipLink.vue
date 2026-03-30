<script setup lang="ts">
  /**
   * 跳过链接 (Skip Link)
   *
   * 为键盘用户提供跳过导航直接访问主内容的链接
   * 按 Tab 键时第一个可聚焦
   *
   * @example
   * <SkipLink targetId="main-content" />
   * <nav>...</nav>
   * <main id="main-content">...</main>
   */
  interface Props {
    /** 目标元素 ID */
    targetId: string
    /** 链接文本 */
    text?: string
  }

  withDefaults(defineProps<Props>(), {
    text: '跳转到主内容',
  })

  function handleClick(targetId: string) {
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }
</script>

<template>
  <a :href="`#${targetId}`" class="skip-link" @click.prevent="handleClick(targetId)">
    {{ text }}
  </a>
</template>

<style scoped>
  .skip-link {
    position: absolute;
    top: -100%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    padding: 12px 24px;
    background: var(--primary-9, #4f46e5);
    color: white;
    font-weight: 500;
    text-decoration: none;
    border-radius: 0 0 8px 8px;
    transition: top 0.2s ease;
  }

  .skip-link:focus {
    top: 0;
    outline: 2px solid var(--focus-ring, #4f46e5);
    outline-offset: 2px;
  }
</style>
