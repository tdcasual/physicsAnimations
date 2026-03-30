<script setup lang="ts" generic="T extends { id: string }">
  /**
   * VirtualList
   *
   * 虚拟滚动列表组件
   * 高效渲染大量数据，只渲染可见区域的项目
   *
   * @example
   * <VirtualList
   *   :items="items"
   *   :item-height="80"
   *   :buffer="5"
   *   v-slot="{ item, index }"
   * >
   *   <div>{{ item.name }}</div>
   * </VirtualList>
   */
  import { computed, ref, watch, onMounted, onUnmounted } from 'vue'

  interface Props {
    /** 列表数据 */
    items: T[]
    /** 每项高度（像素） */
    itemHeight: number
    /** 缓冲区大小（上下额外渲染的项数） */
    buffer?: number
    /** 列表高度（不设置则自适应容器） */
    height?: number
    /** 选中项 ID */
    selectedId?: string | null
  }

  const props = withDefaults(defineProps<Props>(), {
    buffer: 3,
    height: undefined,
    selectedId: null,
  })

  const emit = defineEmits<{
    /** 选择项 */
    (e: 'select', item: T): void
    /** 滚动到底部 */
    (e: 'scroll-end'): void
  }>()

  // 容器引用
  const containerRef = ref<HTMLElement | null>(null)

  // 滚动位置
  const scrollTop = ref(0)
  const containerHeight = ref(0)

  // 计算可见区域
  const totalHeight = computed(() => props.items.length * props.itemHeight)

  const visibleRange = computed(() => {
    const start = Math.floor(scrollTop.value / props.itemHeight)
    const visibleCount = Math.ceil(containerHeight.value / props.itemHeight)

    // 添加缓冲区
    const startIndex = Math.max(0, start - props.buffer)
    const endIndex = Math.min(props.items.length, start + visibleCount + props.buffer)

    return { startIndex, endIndex }
  })

  // 可见项目
  const visibleItems = computed(() => {
    const { startIndex, endIndex } = visibleRange.value
    return props.items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: `${(startIndex + index) * props.itemHeight}px`,
        left: 0,
        right: 0,
        height: `${props.itemHeight}px`,
      },
    }))
  })

  // 判断是否接近底部
  const isNearBottom = computed(() => {
    const scrollBottom = scrollTop.value + containerHeight.value
    const threshold = props.itemHeight * 5 // 提前 5 个项目触发
    return scrollBottom >= totalHeight.value - threshold
  })

  // 处理滚动
  let scrollTimeout: number | null = null
  let rafId: number | null = null

  function handleScroll() {
    if (rafId !== null) return

    rafId = requestAnimationFrame(() => {
      if (containerRef.value) {
        scrollTop.value = containerRef.value.scrollTop
      }
      rafId = null
    })

    // 防抖检测底部
    if (scrollTimeout) {
      window.clearTimeout(scrollTimeout)
    }
    scrollTimeout = window.setTimeout(() => {
      if (isNearBottom.value) {
        emit('scroll-end')
      }
    }, 150)
  }

  // 更新容器高度
  function updateContainerHeight() {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  // ResizeObserver 监听容器大小变化
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    updateContainerHeight()

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateContainerHeight()
      })
      if (containerRef.value) {
        resizeObserver.observe(containerRef.value)
      }
    }
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    if (scrollTimeout) {
      window.clearTimeout(scrollTimeout)
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }
  })

  // 监听选中项变化，自动滚动到可视区域
  watch(
    () => props.selectedId,
    id => {
      if (!id || !containerRef.value) return

      const index = props.items.findIndex(item => item.id === id)
      if (index === -1) return

      const itemTop = index * props.itemHeight
      const itemBottom = itemTop + props.itemHeight
      const scrollBottom = scrollTop.value + containerHeight.value

      // 如果不在可视区域，则滚动
      if (itemTop < scrollTop.value || itemBottom > scrollBottom) {
        containerRef.value.scrollTo({
          top: itemTop - containerHeight.value / 2 + props.itemHeight / 2,
          behavior: 'smooth',
        })
      }
    }
  )

  // 暴露方法
  defineExpose({
    scrollToItem: (id: string, behavior: ScrollBehavior = 'smooth') => {
      const index = props.items.findIndex(item => item.id === id)
      if (index === -1 || !containerRef.value) return

      containerRef.value.scrollTo({
        top: index * props.itemHeight,
        behavior,
      })
    },
    scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
      containerRef.value?.scrollTo({ top: 0, behavior })
    },
    scrollToBottom: (behavior: ScrollBehavior = 'smooth') => {
      if (!containerRef.value) return
      containerRef.value.scrollTo({
        top: totalHeight.value,
        behavior,
      })
    },
  })
</script>

<template>
  <div
    ref="containerRef"
    class="virtual-list"
    :style="{ height: height ? `${height}px` : '100%' }"
    @scroll="handleScroll"
  >
    <div class="virtual-list-content" :style="{ height: `${totalHeight}px` }">
      <div
        v-for="{ item, index, style } in visibleItems"
        :key="item.id"
        class="virtual-list-item"
        :class="{ selected: item.id === selectedId }"
        :style="style"
        @click="emit('select', item)"
      >
        <slot :item="item" :index="index" :selected="item.id === selectedId">
          <!-- 默认内容 -->
          <div class="virtual-list-item-default">{{ item.id }}</div>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .virtual-list {
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    -webkit-overflow-scrolling: touch;
  }

  .virtual-list-content {
    position: relative;
  }

  .virtual-list-item {
    box-sizing: border-box;
    cursor: pointer;
    transition: background-color 150ms ease;
  }

  .virtual-list-item:hover {
    background: color-mix(in srgb, var(--primary, #3b82f6) 5%, transparent);
  }

  .virtual-list-item.selected {
    background: color-mix(in srgb, var(--primary, #3b82f6) 10%, transparent);
  }

  .virtual-list-item-default {
    padding: 12px 16px;
    font-size: calc(14px * var(--ui-scale, 1));
  }

  /* 隐藏滚动条但保持功能 */
  .virtual-list::-webkit-scrollbar {
    width: 6px;
  }

  .virtual-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .virtual-list::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--muted, #9ca3af) 30%, transparent);
    border-radius: 3px;
  }

  .virtual-list::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--muted, #9ca3af) 50%, transparent);
  }
</style>
