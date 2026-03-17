<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import AdminShellHeader from "../../components/admin/AdminShellHeader.vue";
import { useRoute } from "vue-router";

const adminNavGroups = [
  {
    id: "workspace",
    title: "内容管理",
    summary: "内容与上传",
    items: [
      { to: "/admin/dashboard", label: "概览", description: "站点概况" },
      { to: "/admin/content", label: "内容", description: "演示条目管理" },
      { to: "/admin/uploads", label: "上传", description: "素材入库" },
    ],
  },
  {
    id: "library",
    title: "资源结构",
    summary: "文件与分类",
    items: [
      { to: "/admin/library", label: "资源库", description: "文件夹与素材" },
      { to: "/admin/taxonomy", label: "分类", description: "分类结构" },
    ],
  },
  {
    id: "system",
    title: "系统设置",
    summary: "配置与账号",
    items: [
      { to: "/admin/system", label: "系统", description: "同步与配置" },
      { to: "/admin/account", label: "账号", description: "密码与身份" },
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
  <section :class="['admin-layout-view', `admin-layout-view--${currentAdminGroup.id}`]" @keydown.esc.window="closeMobileNav">
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
            <div class="admin-nav-group-links">
              <RouterLink v-for="item in group.items" :key="item.to" class="admin-link" active-class="active" :to="item.to">
                {{ item.label }}
              </RouterLink>
            </div>
          </section>
        </nav>
      </aside>

      <div class="admin-body">
        <RouterView />
      </div>
    </div>
  </section>
</template>

<style>
.admin-layout-view {
  --admin-shell-accent: var(--accent);
  --admin-shell-accent-quiet: var(--accent-copper);
  display: grid;
  gap: 14px;
}

.admin-layout-view--workspace {
  --admin-shell-accent: var(--accent);
  --admin-shell-accent-quiet: oklch(62% 0.14 55 / 0.2);
}

.admin-layout-view--library {
  --admin-shell-accent: var(--accent-copper);
  --admin-shell-accent-quiet: oklch(62% 0.14 55 / 0.15);
}

.admin-layout-view--system {
  --admin-shell-accent: var(--line-strong);
  --admin-shell-accent-quiet: oklch(82% 0.01 250 / 0.3);
}

.admin-layout-view h1 { margin: 0; }

.admin-nav-shell {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-l);
  background: var(--surface);
  padding: 14px;
  transition: opacity 160ms ease;
}

.admin-nav-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(180deg, oklch(58% 0.18 30 / 0.03), transparent 40%);
}

.admin-body,
.admin-nav-group { display: grid; gap: 10px; }

.admin-nav-group-title {
  margin: 0;
  color: var(--muted);
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.admin-shell-status-label {
  margin: 0;
  color: var(--accent);
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-shell-status-strip {
  display: grid;
  gap: 4px;
}

.admin-nav-group-links { display: flex; gap: 8px; flex-wrap: wrap; }

.admin-shell {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.admin-nav-backdrop { display: none; }

.admin-nav { display: grid; gap: 10px; }

.admin-nav-group {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-m);
  background: var(--bg);
}

.admin-nav-group-summary {
  color: var(--muted);
  font-size: calc(12px * var(--ui-scale, 1));
  line-height: 1.5;
}

.admin-link,
.admin-mobile-nav-trigger {
  border: 1px solid var(--border);
  border-radius: var(--radius-s);
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  background: var(--surface);
  font-family: inherit;
  font-size: calc(13px * var(--ui-scale, 1));
  font-weight: 500;
  transition: border-color 140ms ease, background-color 140ms ease;
}

.admin-link { min-height: 44px; text-decoration: none; }
.admin-mobile-nav-trigger { min-height: 44px; }

.admin-link:hover {
  border-color: var(--line-strong);
  background: var(--bg);
}

.admin-mobile-nav-trigger:hover {
  border-color: var(--line-strong);
  background: var(--bg);
}

.admin-link:active,
.admin-mobile-nav-trigger:active {
  transform: scale(0.98);
}

.admin-link.active,
.admin-mobile-nav-trigger {
  border-color: var(--admin-shell-accent);
}

.admin-link.active {
  background: oklch(58% 0.18 30 / 0.08);
  color: var(--accent-strong);
  font-weight: 600;
}

.admin-link-home { white-space: nowrap; }
.admin-mobile-nav-trigger { display: none; cursor: pointer; }

@keyframes admin-shell-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .admin-shell { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .admin-shell-header { padding: 14px; flex-direction: column; }
  .admin-shell-header--compact { padding: 12px 14px; }
  .admin-body { gap: 10px; }
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
    background: oklch(16% 0.025 250 / 0.35);
  }
  .admin-nav-shell {
    display: none;
    padding: 14px;
    position: relative;
    z-index: var(--z-nav);
  }
  .admin-nav-shell.is-open {
    display: block;
    animation: admin-shell-in 160ms ease;
  }
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
