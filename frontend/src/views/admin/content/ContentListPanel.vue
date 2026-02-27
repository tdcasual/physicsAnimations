<script setup lang="ts">
import type { AdminItemRow } from "../../../features/admin/adminApi";

const props = defineProps<{
  items: AdminItemRow[];
  editingId: string;
  loading: boolean;
  errorText: string;
  total: number;
  hasMore: boolean;
  query: string;
  previewHref: (item: AdminItemRow) => string;
  saving: boolean;
}>();

const emit = defineEmits<{
  "update:query": [value: string];
  "begin-edit": [item: AdminItemRow];
  "remove-item": [id: string];
  "restore-item": [id: string];
  "load-more": [];
}>();
</script>

<template>
  <div class="list-divider" />

  <div class="list-header">
    <h3>内容列表</h3>
    <input
      :value="props.query"
      class="field-input list-search"
      type="search"
      placeholder="搜索内容..."
      autocomplete="off"
      @input="emit('update:query', ($event.target as HTMLInputElement).value)"
    />
  </div>

  <div v-if="props.errorText" class="error-text">{{ props.errorText }}</div>

  <div v-if="props.items.length === 0 && !props.loading" class="empty">暂无内容。</div>

  <article
    v-for="item in props.items"
    :key="item.id"
    class="item-card"
    :class="{ selected: props.editingId === item.id }"
  >
    <div class="item-head">
      <div>
        <div class="item-title">{{ item.title || item.id }}</div>
        <div class="item-meta">
          {{ item.categoryId }} · {{ item.type }} · {{ item.deleted ? "已删除" : "正常" }} ·
          {{ item.hidden ? "隐藏" : "可见" }} · {{ item.published === false ? "草稿" : "已发布" }}
        </div>
      </div>
      <div class="item-actions">
        <a class="btn btn-ghost" :href="props.previewHref(item)" target="_blank" rel="noreferrer">预览</a>
        <button
          v-if="item.deleted"
          type="button"
          class="btn btn-primary"
          :disabled="props.saving"
          @click="emit('restore-item', item.id)"
        >
          恢复
        </button>
        <button type="button" class="btn btn-ghost" @click="emit('begin-edit', item)">
          {{ props.editingId === item.id ? "已选中" : "编辑" }}
        </button>
        <button
          v-if="!item.deleted"
          type="button"
          class="btn btn-danger"
          :disabled="props.saving"
          @click="emit('remove-item', item.id)"
        >
          删除
        </button>
      </div>
    </div>
  </article>

  <div class="list-footer">
    <div class="meta">已加载 {{ props.items.length }} / {{ props.total }}</div>
    <button v-if="props.hasMore" type="button" class="btn btn-ghost" :disabled="props.loading" @click="emit('load-more')">
      加载更多
    </button>
  </div>
</template>
