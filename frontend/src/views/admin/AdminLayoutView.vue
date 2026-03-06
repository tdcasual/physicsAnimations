<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";

const adminNavGroups = [
  {
    id: "workspace",
    title: "内容管理",
    items: [
      { to: "/admin/dashboard", label: "概览", description: "查看当前站点入口、工作区状态与常用入口。" },
      { to: "/admin/content", label: "内容", description: "管理演示内容、说明文案和展示组织。" },
      { to: "/admin/uploads", label: "上传", description: "补充新素材并安排进入内容流。" },
    ],
  },
  {
    id: "library",
    title: "资源结构",
    items: [
      { to: "/admin/library", label: "资源库", description: "整理资源文件夹、封面和素材归档。" },
      { to: "/admin/taxonomy", label: "分类", description: "维护导航分组与课堂分类结构。" },
    ],
  },
  {
    id: "system",
    title: "系统设置",
    items: [
      { to: "/admin/system", label: "系统", description: "查看运行配置、引导流程和系统级设置。" },
      { to: "/admin/account", label: "账号", description: "管理账户信息与后台使用偏好。" },
    ],
  },
] as const;

const route = useRoute();
const adminNavRef = ref<HTMLElement | null>(null);
const mobileNavOpen = ref(false);
const adminItems = adminNavGroups.flatMap((group) => group.items);
const currentAdminSection = computed(() => adminItems.find((item) => route.path.startsWith(item.to)) ?? adminItems[0]);

function scrollAdminNavLinkIntoView(target: HTMLElement | null) {
  if (!target) return;
  target.scrollIntoView({ block: "nearest", inline: "nearest" });
}

async function scrollActiveAdminLinkIntoView() {
  await nextTick();
  const nav = adminNavRef.value;
  if (!nav) return;
  const active = nav.querySelector<HTMLElement>(".admin-link.active, .admin-link.router-link-exact-active");
  scrollAdminNavLinkIntoView(active);
}

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false;
    void scrollActiveAdminLinkIntoView();
  },
  { immediate: true },
);

function onAdminNavFocusIn(event: FocusEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains("admin-link")) return;
  scrollAdminNavLinkIntoView(target);
}
</script>

<template>
  <section class="admin-layout-view">
    <header class="admin-shell-header">
      <div class="admin-shell-copy">
        <p class="admin-shell-kicker">后台工作区</p>
        <h1>管理后台</h1>
        <p class="admin-shell-description">当前模块：{{ currentAdminSection.label }} · {{ currentAdminSection.description }}</p>
      </div>
      <div class="admin-shell-actions">
        <RouterLink class="admin-link admin-link-home" to="/">主页面</RouterLink>
        <button
          type="button"
          class="admin-mobile-nav-trigger"
          :aria-expanded="mobileNavOpen ? 'true' : 'false'"
          aria-controls="admin-nav-shell"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          工作区菜单
        </button>
      </div>
    </header>

    <div class="admin-shell">
      <aside id="admin-nav-shell" class="admin-nav-shell" :class="{ 'is-open': mobileNavOpen }">
        <nav ref="adminNavRef" class="admin-nav" @focusin="onAdminNavFocusIn">
          <section v-for="group in adminNavGroups" :key="group.id" class="admin-nav-group">
            <div class="admin-nav-group-title">{{ group.title }}</div>
            <div class="admin-nav-group-links">
              <RouterLink v-for="item in group.items" :key="item.to" class="admin-link" active-class="active" :to="item.to">
                {{ item.label }}
              </RouterLink>
            </div>
          </section>
        </nav>
      </aside>

      <div class="admin-body">
        <section class="admin-context-card">
          <p class="admin-context-kicker">当前工作区</p>
          <h2 class="admin-context-title">{{ currentAdminSection.label }}</h2>
          <p class="admin-context-copy">{{ currentAdminSection.description }}</p>
        </section>
        <RouterView />
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-layout-view { display: grid; gap: 16px; }
h1, .admin-context-title { margin: 0; }
.admin-shell-header,
.admin-nav-shell,
.admin-context-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg));
  box-shadow: 0 12px 32px -24px rgba(15, 23, 42, 0.45);
}
.admin-shell-header::after,
.admin-nav-shell::before,
.admin-context-card::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 48%, var(--border)), transparent);
}
.admin-shell-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px; }
.admin-shell-copy,
.admin-body,
.admin-nav-group { display: grid; gap: 8px; }
.admin-shell-kicker,
.admin-context-kicker,
.admin-nav-group-title {
  margin: 0;
  color: var(--muted);
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.admin-shell-description,
.admin-context-copy { margin: 0; color: var(--muted); }
.admin-shell-actions,
.admin-nav-group-links { display: flex; gap: 8px; flex-wrap: wrap; }
.admin-shell { display: grid; grid-template-columns: minmax(240px, 280px) minmax(0, 1fr); gap: 16px; align-items: start; }
.admin-nav-shell { padding: 14px; transition: opacity 180ms ease, transform 180ms ease; }
.admin-nav { display: grid; gap: 14px; }
.admin-nav-group {
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 10%, var(--border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 90%, var(--bg));
}
.admin-link,
.admin-mobile-nav-trigger {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  background: color-mix(in srgb, var(--surface) 88%, var(--bg));
  font-size: calc(13px * var(--ui-scale, 1));
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}
.admin-link { min-height: 44px; text-decoration: none; }
.admin-mobile-nav-trigger { min-height: 44px; }
.admin-link:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--primary) 34%, var(--border));
  box-shadow: 0 10px 24px -22px rgba(37, 99, 235, 0.55);
}
.admin-mobile-nav-trigger:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--primary) 34%, var(--border));
  box-shadow: 0 10px 24px -22px rgba(37, 99, 235, 0.55);
}
.admin-link:active,
.admin-mobile-nav-trigger:active { transform: translateY(0) scale(0.985); }
.admin-link.active,
.admin-mobile-nav-trigger {
  border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
}
.admin-link.active { background: color-mix(in srgb, var(--primary) 15%, var(--surface)); }
.admin-link-home { white-space: nowrap; }
.admin-mobile-nav-trigger { display: none; cursor: pointer; }
.admin-context-card { position: relative; padding: 16px; }

@keyframes admin-shell-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 900px) {
  .admin-shell { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .admin-shell-header { padding: 14px; flex-direction: column; }
  .admin-shell-actions { width: 100%; }
  .admin-link-home,
  .admin-mobile-nav-trigger { flex: 1 1 calc(50% - 4px); }
  .admin-mobile-nav-trigger { display: inline-flex; }
  .admin-nav-shell { display: none; padding: 12px; transform-origin: top center; }
  .admin-nav-shell.is-open { display: block; animation: admin-shell-in 180ms ease; }
  .admin-nav {
    display: flex;
    gap: 12px;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    padding-bottom: 4px;
  }
  .admin-nav-group { flex: 0 0 min(240px, 84vw); }
  .admin-nav-group-links { flex-wrap: wrap; }
  .admin-link { flex: 0 0 auto; }
}
</style>
