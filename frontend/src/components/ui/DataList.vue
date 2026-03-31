<script setup lang="ts" generic="T extends { id: string }">
  /**
   * DataList
   *
   * 通用数据列表组件
   * 支持搜索、加载更多、选中状态
   *
   * @example
   * <DataList
   *   :items="items"
   *   :selected-id="selectedId"
   *   :loading="loading"
   *   :has-more="hasMore"
   *   v-model:query="query"
   *   @select="handleSelect"
   *   @load-more="loadMore"
   * >
   *   <template #item="{ item }">
   *     <div>{{ item.name }}</div>
   *   </template>
   * </DataList>
   */
  import { computed } from 'vue'
  import SearchField from './SearchField.vue'

  interface Props {
    /** 列表数据 */
    items: T[]
    /** 当前选中项 ID */
    selectedId?: string | null
    /** 加载状态 */
    loading?: boolean
    /** 错误文本 */
    errorText?: string
    /** 总数 */
    total?: number
    /** 是否还有更多 */
    hasMore?: boolean
    /** 搜索关键词 */
    query?: string
    /** 搜索占位符 */
    searchPlaceholder?: string
    /** 空数据提示 */
    emptyText?: string
    /** 加载中提示 */
    loadingText?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    selectedId: null,
    loading: false,
    errorText: '',
    total: 0,
    hasMore: false,
    query: '',
    searchPlaceholder: '搜索...',
    emptyText: '暂无数据',
    loadingText: '加载中...',
  })

  const emit = defineEmits<{
    /** 选择项 */
    (e: 'select', item: T): void
    /** 加载更多 */
    (e: 'load-more'): void
    /** 更新搜索 */
    (e: 'update:query', value: string): void
  }>()

  const queryModel = computed({
    get: () => props.query,
    set: value => emit('update:query', value),
  })

  const showEmpty = computed(() => !props.loading && props.items.length === 0)
  const showLoadMore = computed(() => props.hasMore && !props.loading)
  const itemCountText = computed(() => `共 ${props.total} 项`)
</script>

<template>
  <div class="data-list">
    <!-- 头部 -->
    <div class="data-list-header">
      <slot name="header">
        <SearchField
          v-model="queryModel"
          :placeholder="searchPlaceholder"
          class="data-list-search"
        />
      </slot>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorText" class="data-list-error">
      {{ errorText }}
    </div>

    <!-- 加载中 -->
    <div v-else-if="loading && items.length === 0" class="data-list-loading">
      {{ loadingText }}
    </div>

    <!-- 空状态 -->
    <div v-else-if="showEmpty" class="data-list-empty">
      {{ emptyText }}
    </div>

    <!-- 列表内容 -->
    <div v-else class="data-list-content">
      <slot name="list-header" />

      <ul class="data-list-items">
        <li
          v-for="item in items"
          :key="item.id"
          :class="['data-list-item', { selected: item.id === selectedId }]"
          tabindex="0"
          role="button"
          :aria-pressed="item.id === selectedId"
          @click="emit('select', item)"
          @keydown.enter.prevent="emit('select', item)"
          @keydown.space.prevent="emit('select', item)"
        >
          <slot name="item" :item="item" :selected="item.id === selectedId">
            <!-- 默认显示 ID -->
            <span>{{ item.id }}</span>
          </slot>
        </li>
      </ul>

      <slot name="list-footer" />

      <!-- 加载更多 -->
      <div v-if="items.length > 0" class="data-list-footer">
        <span class="data-list-meta">{{ itemCountText }}</span>
        <button
          v-if="showLoadMore"
          type="button"
          class="data-list-load-more"
          :disabled="loading"
          @click="emit('load-more')"
        >
          {{ loading ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .data-list {
    display: grid;
    gap: 12px;
  }

  .data-list-header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .data-list-search {
    width: min(360px, 100%);
  }
  
  /* 平板搜索框宽度优化 */
  @media (min-width: 641px) and (max-width: 1024px) {
    .data-list-search {
      width: min(480px, 100%);
    }
  }

  .data-list-error {
    color: var(--danger, #dc2626);
    padding: 16px;
    background: color-mix(in srgb, var(--danger, #dc2626) 8%, transparent);
    border-radius: 8px;
    font-size: calc(14px * var(--ui-scale, 1));
  }

  .data-list-loading,
  .data-list-empty {
    padding: 32px 16px;
    text-align: center;
    color: var(--muted, #6b7280);
    border: 1px dashed var(--border, #e5e7eb);
    border-radius: 8px;
    font-size: calc(14px * var(--ui-scale, 1));
  }

  .data-list-content {
    display: grid;
    gap: 12px;
  }

  .data-list-items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .data-list-item {
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 10px;
    padding: 10px;
    display: grid;
    gap: 10px;
    background: color-mix(in srgb, var(--surface, #fff) 90%, var(--bg, #f9fafb));
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition:
      border-color 150ms ease,
      background-color 150ms ease;
  }

  .data-list-item:hover {
    border-color: color-mix(in srgb, var(--primary, #3b82f6) 50%, var(--border, #e5e7eb));
  }

  .data-list-item.selected {
    border-color: color-mix(in srgb, var(--primary, #3b82f6) 70%, var(--border, #e5e7eb));
    background: color-mix(in srgb, var(--primary, #3b82f6) 9%, var(--surface, #fff));
  }

  .data-list-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-top: 8px;
    border-top: 1px dashed var(--border, #e5e7eb);
  }

  .data-list-meta {
    color: var(--muted, #6b7280);
    font-size: calc(12px * var(--ui-scale, 1));
  }

  .data-list-load-more {
    padding: 8px 16px;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 8px;
    background: var(--surface, #fff);
    color: var(--text, #374151);
    font-size: calc(14px * var(--ui-scale, 1));
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    min-height: 44px;
    min-width: 44px;
    transition: background-color 150ms ease;
  }

  .data-list-load-more:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary, #3b82f6) 8%, var(--surface, #fff));
  }

  .data-list-load-more:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* 平板响应式 */
  @media (min-width: 641px) and (max-width: 1024px) {
    .data-list-header {
      gap: 12px;
    }
    
    .data-list-items {
      gap: 10px;
    }
    
    .data-list-item {
      padding: 14px;
      min-height: 64px;
    }
  }

  @media (max-width: 640px) {
    .data-list-header {
      gap: 6px;
    }

    .data-list-search {
      width: 100%;
    }

    .data-list-item {
      padding: 12px;
    }
  }
</style>
