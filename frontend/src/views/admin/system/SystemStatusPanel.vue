<script setup lang="ts">
import type { SystemStorage } from "../../../features/admin/system/useSystemWizard";

defineProps<{
  loading: boolean;
  storage: SystemStorage | null;
  formatDate: (raw: string) => string;
}>();
</script>

<template>
  <div class="panel admin-card">
    <h3>当前状态</h3>
    <div v-if="loading" class="empty">加载中...</div>
    <div v-else-if="storage" class="status-grid">
      <div><span>配置模式：</span>{{ storage.mode }}</div>
      <div><span>实际模式：</span>{{ storage.effectiveMode }}</div>
      <div><span>本地路径：</span>{{ storage.localPath || "-" }}</div>
      <div><span>WebDAV URL：</span>{{ storage.webdav.url || "-" }}</div>
      <div><span>WebDAV Base Path：</span>{{ storage.webdav.basePath || "-" }}</div>
      <div><span>WebDAV 用户：</span>{{ storage.webdav.username || "-" }}</div>
      <div><span>WebDAV 密码：</span>{{ storage.webdav.hasPassword ? "已配置" : "未配置" }}</div>
      <div><span>上次同步：</span>{{ formatDate(storage.lastSyncedAt) }}</div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 10px;
}

h3 {
  margin: 0;
  font-size: 16px;
}

.status-grid {
  display: grid;
  gap: 6px;
}

.status-grid > div {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.status-grid span {
  color: var(--muted);
}

.empty {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 14px;
  color: var(--muted);
}
</style>
