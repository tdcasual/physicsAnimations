<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const adminNavRef = ref<HTMLElement | null>(null);

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
    <h1>管理后台</h1>
    <nav ref="adminNavRef" class="admin-nav" @focusin="onAdminNavFocusIn">
      <RouterLink class="admin-link" to="/">主页面</RouterLink>
      <RouterLink class="admin-link" active-class="active" to="/admin/dashboard">概览</RouterLink>
      <RouterLink class="admin-link" active-class="active" to="/admin/content">内容</RouterLink>
      <RouterLink class="admin-link" active-class="active" to="/admin/uploads">上传</RouterLink>
      <RouterLink class="admin-link" active-class="active" to="/admin/library">资源库</RouterLink>
      <RouterLink class="admin-link" active-class="active" to="/admin/taxonomy">分类</RouterLink>
      <RouterLink class="admin-link" active-class="active" to="/admin/system">系统</RouterLink>
      <RouterLink class="admin-link" active-class="active" to="/admin/account">账号</RouterLink>
    </nav>
    <div class="admin-body">
      <RouterView />
    </div>
  </section>
</template>

<style scoped>
.admin-layout-view {
  display: grid;
  gap: 12px;
}

h1 {
  margin: 0;
}

.admin-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-link {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: inherit;
  background: color-mix(in srgb, var(--surface) 88%, var(--bg));
  font-size: calc(13px * var(--ui-scale, 1));
}

.admin-link.active {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 15%, var(--surface));
}

.admin-body {
  display: grid;
}

@media (max-width: 640px) {
  .admin-nav {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    padding-bottom: 4px;
  }

  .admin-link {
    flex: 0 0 auto;
  }
}
</style>
