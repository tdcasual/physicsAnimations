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
    <header class="admin-page-header admin-page-header--dashboard">
      <div class="admin-page-copy dashboard-copy">
        <p class="admin-page-kicker dashboard-kicker">今日工作台</p>
        <h2>概览</h2>
        <p class="admin-page-intro admin-page-intro--supporting dashboard-intro">先做最近课堂会用到的动作。</p>
      </div>
      <div class="admin-page-meta">
        <span class="admin-page-meta-label">当前节奏</span>
        <strong>{{ loading ? "正在刷新工作区" : "先做课堂相关任务" }}</strong>
        <span class="admin-page-meta-copy">{{ loading ? "正在同步站点信号和工作区入口。" : "上传、内容与资源整理优先，整体巡检随后。" }}</span>
        <div class="admin-actions">
          <button type="button" class="btn btn-ghost" :disabled="loading" @click="reload">刷新</button>
        </div>
      </div>
    </header>

    <div v-if="errorText" class="error-text">{{ errorText }}</div>
    <div v-if="loading" class="empty">加载中...</div>

    <template v-else>
      <section class="admin-task-grid admin-task-grid--dense" aria-label="今日工作台">
        <article class="admin-task-card admin-task-card--primary admin-task-card--queue admin-task-card--focus admin-card">
          <div class="admin-task-meta">
            <span class="admin-task-badge">优先级 高</span>
            <span>先做</span>
          </div>
          <p class="admin-task-kicker">下一步</p>
          <h3>补充或修订即将上课的演示</h3>
          <p class="admin-task-copy admin-task-copy--supporting">上传新素材并补全标题说明，让目录入口能马上使用。</p>
          <div class="admin-task-actions">
            <RouterLink class="btn btn-primary" to="/admin/uploads">上传素材</RouterLink>
            <RouterLink class="btn btn-ghost" to="/admin/content">整理内容</RouterLink>
          </div>
        </article>

        <article class="admin-task-card admin-task-card--queue admin-task-card--secondary admin-card">
          <div class="admin-task-meta">
            <span class="admin-task-badge">优先级 中</span>
            <span>归档整理</span>
          </div>
          <p class="admin-task-kicker">归档</p>
          <h3>检查资源库结构</h3>
          <p class="admin-task-copy admin-task-copy--secondary">如果课堂要用完整文件或容器页，先到资源库整理封面和素材结构。</p>
          <div class="admin-task-actions">
            <RouterLink class="btn btn-ghost" to="/admin/library">打开资源库</RouterLink>
          </div>
        </article>

        <article class="admin-task-card admin-task-card--queue admin-task-card--secondary admin-card">
          <div class="admin-task-meta">
            <span class="admin-task-badge">优先级 中</span>
            <span>发布前巡检</span>
          </div>
          <p class="admin-task-kicker">巡检</p>
          <h3>确认系统和分类配置</h3>
          <p class="admin-task-copy admin-task-copy--secondary">发布前回看分类与系统设置，避免目录入口和同步配置脱节。</p>
          <div class="admin-task-actions">
            <RouterLink class="btn btn-ghost" to="/admin/taxonomy">分类</RouterLink>
            <RouterLink class="btn btn-ghost" to="/admin/system">系统</RouterLink>
          </div>
        </article>
      </section>

      <section class="admin-signal-section">
        <div class="signal-heading">
          <p class="admin-page-kicker dashboard-kicker">运行概况</p>
          <h3>站点信号</h3>
        </div>
        <div class="stats-grid">
          <article class="admin-signal-card admin-signal-card--metric admin-card">
            <div class="label">全部内容</div>
            <div class="value">{{ stats.total }}</div>
            <div class="signal-copy">当前可进入公开目录的总演示数</div>
          </article>
          <article class="admin-signal-card admin-signal-card--metric admin-card">
            <div class="label">上传内容</div>
            <div class="value">{{ stats.uploadTotal }}</div>
            <div class="signal-copy">已进入站内托管与截图流程的资源</div>
          </article>
          <article class="admin-signal-card admin-signal-card--metric admin-card">
            <div class="label">外链内容</div>
            <div class="value">{{ stats.linkTotal }}</div>
            <div class="signal-copy">仍依赖外部页面或镜像访问的资源</div>
          </article>
          <article class="admin-signal-card admin-signal-card--metric admin-card">
            <div class="label">二级分类</div>
            <div class="value">{{ stats.categoryTotal }}</div>
            <div class="signal-copy">影响首页导航分章和课堂筛选的目录节点</div>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.admin-dashboard-view {
  display: grid;
  gap: 16px;
}

.dashboard-copy,
.signal-heading {
  display: grid;
  gap: 6px;
}

.dashboard-kicker,
.admin-task-kicker {
  margin: 0;
  color: color-mix(in oklab, var(--accent-copper-strong) 70%, var(--text));
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

h2,
h3 {
  margin: 0;
}

.dashboard-intro,
.signal-copy,
.admin-task-card p:last-of-type {
  margin: 0;
  color: var(--muted);
}

.admin-task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.admin-task-grid--dense {
  gap: 10px;
}

.admin-task-card,
.admin-signal-card {
  padding: 16px;
}

.admin-task-card {
  display: grid;
  gap: 10px;
}

.admin-task-card--focus {
  border-color: color-mix(in oklab, var(--accent) 28%, var(--border));
  box-shadow: 0 24px 46px -32px color-mix(in oklab, var(--accent) 28%, transparent);
}

.admin-task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.admin-task-badge {
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--accent-copper) 16%, var(--surface));
  color: color-mix(in oklab, var(--accent-copper-strong) 76%, var(--text));
  font-weight: 700;
}

.admin-task-card--queue {
  position: relative;
  padding-top: 18px;
}

.admin-task-card--queue::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, color-mix(in oklab, var(--accent-copper) 62%, transparent), transparent 72%);
}

.admin-task-card--primary {
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--accent) 10%, var(--surface)), color-mix(in oklab, var(--surface) 92%, var(--paper))),
    var(--surface);
}

.admin-task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-signal-section {
  display: grid;
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.admin-signal-card {
  display: grid;
  gap: 8px;
}

.admin-signal-card--metric {
  position: relative;
  padding-top: 18px;
}

.admin-signal-card--metric::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, color-mix(in oklab, var(--accent) 52%, transparent), transparent 78%);
}

.label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.value {
  font-family: "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", serif;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
}

.empty {
  border: 1px dashed color-mix(in oklab, var(--line-strong) 20%, var(--border));
  border-radius: 12px;
  padding: 14px;
  color: var(--muted);
  background: color-mix(in oklab, var(--surface) 86%, var(--paper));
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}

@media (max-width: 640px) {
  .header-row {
    align-items: stretch;
    flex-direction: column;
  }

  .header-row :where(.btn) {
    width: 100%;
  }

  .admin-task-actions :where(.btn) {
    flex: 1 1 calc(50% - 4px);
  }

  .admin-task-card--secondary {
    gap: 8px;
    padding: 14px;
  }

  .admin-task-copy--secondary {
    display: none;
  }
}
</style>
