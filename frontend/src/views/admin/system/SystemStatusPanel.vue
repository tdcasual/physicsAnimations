<script setup lang="ts">
import type { SystemStorage } from "../../../features/admin/system/useSystemWizard";
import { PACard } from "@/components/ui/patterns";

defineProps<{
  loading: boolean;
  storage: SystemStorage | null;
  formatDate: (raw: string) => string;
}>();
</script>

<template>
  <PACard variant="admin" class="panel p-3">
    <h3 class="admin-panel-title">当前状态</h3>
    <div v-if="loading" class="empty">加载中...</div>
    <div v-else-if="storage" class="status-grid">
      <div class="break-anywhere"><span>配置模式：</span>{{ storage.mode }}</div>
      <div class="break-anywhere"><span>实际模式：</span>{{ storage.effectiveMode }}</div>
      <div class="break-anywhere"><span>本地路径：</span>{{ storage.localPath || "-" }}</div>
      <div class="break-anywhere"><span>WebDAV URL：</span>{{ storage.webdav.url || "-" }}</div>
      <div class="break-anywhere"><span>WebDAV Base Path：</span>{{ storage.webdav.basePath || "-" }}</div>
      <div class="break-anywhere"><span>WebDAV 用户：</span>{{ storage.webdav.username || "-" }}</div>
      <div class="break-anywhere"><span>WebDAV 密码：</span>{{ storage.webdav.hasPassword ? "已配置" : "未配置" }}</div>
      <div class="break-anywhere"><span>上次同步：</span>{{ formatDate(storage.lastSyncedAt) }}</div>
    </div>
  </PACard>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 10px;
}

.status-grid span {
  color: var(--muted);
}
</style>
