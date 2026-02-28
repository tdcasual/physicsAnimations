<script setup lang="ts">
import { onMounted, ref } from "vue";
import { fetchDashboardStats, type DashboardStats } from "../../features/admin/adminApi";

const loading = ref(false);
const errorText = ref("");
const reloadSeq = ref(0);
const stats = ref<DashboardStats>({
  dynamicTotal: 0,
  uploadTotal: 0,
  linkTotal: 0,
  builtinTotal: 0,
  categoryTotal: 0,
  total: 0,
});

async function reload() {
  const requestSeq = reloadSeq.value + 1;
  reloadSeq.value = requestSeq;
  loading.value = true;
  errorText.value = "";
  try {
    const nextStats = await fetchDashboardStats();
    if (requestSeq !== reloadSeq.value) return;
    stats.value = nextStats;
  } catch (err) {
    if (requestSeq !== reloadSeq.value) return;
    const e = err as { status?: number };
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "加载统计失败。";
  } finally {
    if (requestSeq === reloadSeq.value) {
      loading.value = false;
    }
  }
}

onMounted(async () => {
  await reload();
});
</script>

<template>
  <section class="admin-dashboard-view">
    <div class="header-row">
      <h2>概览</h2>
      <button type="button" class="btn btn-ghost" :disabled="loading" @click="reload">刷新</button>
    </div>

    <div v-if="errorText" class="error-text">{{ errorText }}</div>
    <div v-if="loading" class="empty">加载中...</div>

    <div v-else class="stats-grid">
      <article class="stat-card">
        <div class="label">全部内容</div>
        <div class="value">{{ stats.total }}</div>
      </article>
      <article class="stat-card">
        <div class="label">上传内容</div>
        <div class="value">{{ stats.uploadTotal }}</div>
      </article>
      <article class="stat-card">
        <div class="label">外链内容</div>
        <div class="value">{{ stats.linkTotal }}</div>
      </article>
      <article class="stat-card">
        <div class="label">内置内容</div>
        <div class="value">{{ stats.builtinTotal }}</div>
      </article>
      <article class="stat-card">
        <div class="label">二级分类</div>
        <div class="value">{{ stats.categoryTotal }}</div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.admin-dashboard-view {
  display: grid;
  gap: 12px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

h2 {
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.stat-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
}

.label {
  color: var(--muted);
  font-size: 12px;
}

.value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
}

.empty {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 14px;
  color: var(--muted);
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}
</style>
