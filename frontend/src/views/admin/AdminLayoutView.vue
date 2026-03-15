<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import AdminShellHeader from "../../components/admin/AdminShellHeader.vue";
import { RouterLink, useRoute } from "vue-router";

const adminNavGroups = [
  {
    id: "workspace",
    title: "内容管理",
    summary: "3 项常用操作 · 内容修订优先",
    items: [
      { to: "/admin/dashboard", label: "概览", description: "查看当前站点入口、工作区状态与常用入口。" },
      { to: "/admin/content", label: "内容", description: "管理演示内容、说明文案和展示组织。" },
      { to: "/admin/uploads", label: "上传", description: "补充新素材并安排进入内容流。" },
    ],
  },
  {
    id: "library",
    title: "资源结构",
    summary: "2 个归档入口 · 优先补齐素材组织",
    items: [
      { to: "/admin/library", label: "资源库", description: "整理资源文件夹、封面和素材归档。" },
      { to: "/admin/taxonomy", label: "分类", description: "维护导航分组与课堂分类结构。" },
    ],
  },
  {
    id: "system",
    title: "系统设置",
    summary: "2 个系统面板 · 发布前集中巡检",
    items: [
      { to: "/admin/system", label: "系统", description: "查看运行配置、引导流程和系统级设置。" },
      { to: "/admin/account", label: "账号", description: "管理账户信息与后台使用偏好。" },
    ],
  },
] as const;

const route = useRoute();
const adminNavRef = ref<HTMLElement | null>(null);
const adminNavShellRef = ref<HTMLElement | null>(null);
const adminNavTriggerRef = ref<HTMLElement | null>(null);
const adminHeaderRef = ref<{ focusTrigger: () => void } | null>(null);
const mobileNavOpen = ref(false);
const adminItems = adminNavGroups.flatMap((group) => group.items);
const currentAdminGroup = computed(
  () => adminNavGroups.find((group) => group.items.some((item) => route.path.startsWith(item.to))) ?? adminNavGroups[0],
);
const currentAdminSection = computed(() => adminItems.find((item) => route.path.startsWith(item.to)) ?? adminItems[0]);
const adminWorkspaceCount = adminItems.length;

let lastFocusedBeforeMobileNav: HTMLElement | null = null;
let bodyOverflowBeforeMobileNav = "";

function openMobileNav() {
  lastFocusedBeforeMobileNav = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  adminNavTriggerRef.value = lastFocusedBeforeMobileNav;
  mobileNavOpen.value = true;
}

function closeMobileNav() {
  mobileNavOpen.value = false;
}

function toggleMobileNav() {
  if (mobileNavOpen.value) {
    closeMobileNav();
    return;
  }
  openMobileNav();
}

function applyAdminDocumentTitle() {
  document.title = `${currentAdminSection.value.label} - 管理后台`;
}

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
    closeMobileNav();
    applyAdminDocumentTitle();
    void scrollActiveAdminLinkIntoView();
  },
  { immediate: true },
);

function onAdminNavFocusIn(event: FocusEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains("admin-link")) return;
  scrollAdminNavLinkIntoView(target);
}

function getMobileNavFocusables(): HTMLElement[] {
  const shell = adminNavShellRef.value;
  if (!shell) return [];
  const focusable = shell.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])',
  );
  return Array.from(focusable).filter((node) => !node.hasAttribute("disabled") && node.tabIndex !== -1);
}

function handleMobileNavKeydown(event: KeyboardEvent) {
  if (!mobileNavOpen.value) return;
  if (event.key !== "Tab") return;

  const focusables = getMobileNavFocusables();
  if (focusables.length === 0) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;
  const inShell = active ? adminNavShellRef.value?.contains(active) === true : false;

  if (event.shiftKey) {
    if (!inShell || active === first) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (!inShell || active === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(mobileNavOpen, async (open) => {
  if (open) {
    bodyOverflowBeforeMobileNav = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    await nextTick();
    adminNavShellRef.value?.querySelector<HTMLElement>(".admin-link")?.focus();
    return;
  }

  document.body.style.overflow = bodyOverflowBeforeMobileNav;
  bodyOverflowBeforeMobileNav = "";
  const restoreTarget = lastFocusedBeforeMobileNav || adminNavTriggerRef.value;
  lastFocusedBeforeMobileNav = null;
  if (restoreTarget) {
    restoreTarget.focus();
    return;
  }
  adminHeaderRef.value?.focusTrigger();
});

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflowBeforeMobileNav;
});
</script>

<template>
  <section class="admin-layout-view" @keydown.esc.window="closeMobileNav">
    <AdminShellHeader
      ref="adminHeaderRef"
      :current-admin-section="currentAdminSection"
      :current-admin-group="currentAdminGroup"
      :mobile-nav-open="mobileNavOpen"
      @toggle-mobile-nav="toggleMobileNav"
    />

    <div class="admin-shell">
      <button
        v-if="mobileNavOpen"
        type="button"
        class="admin-nav-backdrop"
        aria-label="关闭工作区菜单"
        @click="closeMobileNav"
      />
      <aside
        id="admin-nav-shell"
        ref="adminNavShellRef"
        class="admin-nav-shell"
        :class="{ 'is-open': mobileNavOpen }"
        @keydown="handleMobileNavKeydown"
      >
        <nav ref="adminNavRef" class="admin-nav" @focusin="onAdminNavFocusIn">
          <section v-for="group in adminNavGroups" :key="group.id" class="admin-nav-group">
            <div class="admin-nav-group-title">{{ group.title }}</div>
            <div class="admin-nav-group-summary">{{ group.summary }}</div>
            <div class="admin-nav-group-links">
              <RouterLink v-for="item in group.items" :key="item.to" class="admin-link" active-class="active" :to="item.to">
                {{ item.label }}
              </RouterLink>
            </div>
          </section>
        </nav>
      </aside>

      <div class="admin-body">
        <section class="admin-context-card" :class="['admin-context-card--active']">
          <p class="admin-context-kicker">当前工作区</p>
          <div class="admin-shell-status-strip">
            <p class="admin-context-status">执行中</p>
            <span>优先维持当前模块的连续处理，再切换其他工作区。</span>
          </div>
          <h2 class="admin-context-title">{{ currentAdminSection.label }}</h2>
          <p class="admin-context-copy">围绕当前模块继续处理任务、巡检与补档动作。</p>
          <p class="admin-context-note">{{ adminWorkspaceCount }} 个工作区入口保持同一条执行路径；移动端通过工作区菜单切换。</p>
          <RouterLink class="admin-link admin-link-home" to="/">主页面</RouterLink>
        </section>
        <RouterView />
      </div>
    </div>
  </section>
</template>

<style>
.admin-layout-view { display: grid; gap: 16px; }
.admin-layout-view h1, .admin-context-title { margin: 0; }
.admin-nav-shell,
.admin-context-card {
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 20px;
  background: color-mix(in oklab, var(--surface) 94%, var(--paper));
  box-shadow: 0 24px 52px -38px color-mix(in oklab, var(--ink) 26%, transparent);
}
.admin-nav-shell::before,
.admin-context-card::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--accent) 48%, var(--border)), transparent);
}
.admin-body,
.admin-nav-group { display: grid; gap: 8px; }
.admin-context-kicker,
.admin-nav-group-title {
  margin: 0;
  color: var(--muted);
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.admin-shell-status-label,
.admin-context-status {
  margin: 0;
  color: color-mix(in oklab, var(--accent-copper-strong) 72%, var(--text));
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.admin-shell-status-strip {
  display: grid;
  gap: 4px;
}
.admin-context-copy,
.admin-context-note { margin: 0; color: var(--muted); }
.admin-context-note { max-width: 52ch; font-size: calc(13px * var(--ui-scale, 1)); }
.admin-nav-group-links { display: flex; gap: 8px; flex-wrap: wrap; }
.admin-shell { display: grid; grid-template-columns: minmax(240px, 280px) minmax(0, 1fr); gap: 16px; align-items: start; }
.admin-nav-backdrop { display: none; }
.admin-nav-shell {
  padding: 14px;
  transition: opacity 180ms ease, transform 180ms ease;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--accent-copper) 6%, var(--surface)), color-mix(in oklab, var(--surface) 94%, var(--paper))),
    var(--surface);
}
.admin-nav { display: grid; gap: 14px; }
.admin-nav-group {
  padding: 12px;
  border: 1px solid color-mix(in oklab, var(--accent) 10%, var(--border));
  border-radius: 16px;
  background: color-mix(in oklab, var(--surface) 92%, var(--paper));
}
.admin-nav-group-summary {
  color: var(--muted);
  font-size: calc(12px * var(--ui-scale, 1));
  line-height: 1.5;
}
.admin-link,
.admin-mobile-nav-trigger {
  border: 1px solid color-mix(in oklab, var(--line-strong) 16%, var(--border));
  border-radius: 14px;
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  background: color-mix(in oklab, var(--surface) 88%, var(--paper));
  font-size: calc(13px * var(--ui-scale, 1));
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}
.admin-link { min-height: 44px; text-decoration: none; }
.admin-mobile-nav-trigger { min-height: 44px; }
.admin-link:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--accent) 34%, var(--border));
  box-shadow: 0 14px 26px -22px color-mix(in oklab, var(--accent) 42%, transparent);
}
.admin-mobile-nav-trigger:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--accent) 34%, var(--border));
  box-shadow: 0 14px 26px -22px color-mix(in oklab, var(--accent) 42%, transparent);
}
.admin-link:active,
.admin-mobile-nav-trigger:active { transform: translateY(0) scale(0.985); }
.admin-link.active,
.admin-mobile-nav-trigger {
  border-color: color-mix(in oklab, var(--accent) 55%, var(--border));
}
.admin-link.active {
  background: color-mix(in oklab, var(--accent) 16%, var(--surface));
  color: color-mix(in oklab, var(--accent-strong) 60%, var(--text));
}
.admin-link-home { white-space: nowrap; }
.admin-mobile-nav-trigger { display: none; cursor: pointer; }
.admin-context-card {
  position: relative;
  padding: 18px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--accent-copper) 8%, var(--surface)), color-mix(in oklab, var(--surface) 94%, var(--paper))),
    var(--surface);
}
.admin-context-card--active {
  box-shadow: 0 24px 52px -38px color-mix(in oklab, var(--accent-copper) 22%, transparent);
}

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
  .admin-shell-header--compact { padding: 12px 14px; }
  .admin-shell-actions { width: 100%; }
  .admin-link-home,
  .admin-mobile-nav-trigger { flex: 1 1 calc(50% - 4px); }
  .admin-mobile-nav-trigger { display: inline-flex; }
  .admin-nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 4;
    border: 0;
    padding: 0;
    background: rgba(15, 23, 42, 0.28);
  }
  .admin-nav-shell {
    display: none;
    padding: 12px;
    transform-origin: top center;
    position: relative;
    z-index: 5;
  }
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
