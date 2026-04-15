<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import AdminShellHeader from "../../components/admin/AdminShellHeader.vue";
import { adminNavGroups, adminNavItems } from "../../features/admin/adminNavConfig";
import { useRoute } from "vue-router";

const route = useRoute();
const adminNavRef = ref<HTMLElement | null>(null);
const adminMobileLinksRef = ref<HTMLElement | null>(null);
const adminNavShellRef = ref<HTMLElement | null>(null);
const adminNavTriggerRef = ref<HTMLElement | null>(null);
const mobileNavOpen = ref(false);
const currentAdminGroup = computed(
  () => adminNavGroups.find((group) => group.items.some((item) => route.path.startsWith(item.to))) ?? adminNavGroups[0],
);
const currentAdminSection = computed(() => adminNavItems.find((item) => route.path.startsWith(item.to)) ?? adminNavItems[0]);

let lastFocusedBeforeMobileNav: HTMLElement | null = null;
let bodyOverflowBeforeMobileNav = "";

function openMobileNav() {
  lastFocusedBeforeMobileNav = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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

function findActiveAdminLink(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null;
  return container.querySelector<HTMLElement>(".admin-link.active, .admin-link.router-link-exact-active");
}

async function scrollActiveAdminLinkIntoView() {
  await nextTick();
  scrollAdminNavLinkIntoView(findActiveAdminLink(adminNavRef.value));
  scrollAdminNavLinkIntoView(findActiveAdminLink(adminMobileLinksRef.value));
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
  restoreTarget?.focus();
});

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflowBeforeMobileNav;
});
</script>

<template>
  <section 
    :class="['admin-layout-view', `admin-layout-view--${currentAdminGroup.id}`]" 
    @keydown.esc.window="closeMobileNav"
  >
    <AdminShellHeader :current-admin-section="currentAdminSection" :current-admin-group="currentAdminGroup" />

    <div class="admin-shell">
      <div class="admin-mobile-nav-strip">
        <div class="admin-mobile-nav-group">
          <span class="admin-mobile-nav-kicker">当前分组</span>
          <strong>{{ currentAdminGroup.title }}</strong>
          <span class="admin-mobile-nav-summary">{{ currentAdminGroup.summary }}</span>
        </div>
        <button
          ref="adminNavTriggerRef"
          type="button"
          class="admin-mobile-nav-trigger"
          :aria-expanded="mobileNavOpen ? 'true' : 'false'"
          aria-controls="admin-nav-shell"
          @click="toggleMobileNav"
        >
          切换模块
        </button>
      </div>

      <div ref="adminMobileLinksRef" class="admin-mobile-nav-links" aria-label="当前分组页面">
        <RouterLink
          v-for="item in currentAdminGroup.items"
          :key="item.to"
          class="admin-link admin-link--mobile-strip"
          active-class="active"
          :to="item.to"
        >
          <span class="admin-mobile-nav-link-label">{{ item.label }}</span>
          <span class="admin-mobile-nav-link-copy">{{ item.description }}</span>
        </RouterLink>
      </div>

      <button
        v-if="mobileNavOpen"
        type="button"
        class="admin-nav-backdrop"
        aria-label="关闭工作区菜单"
        @click="closeMobileNav"
      />
      
      <!-- Unified Navigation Bar -->
      <nav
        id="admin-nav-shell"
        ref="adminNavShellRef"
        class="admin-nav-bar"
        :class="{ 'is-open': mobileNavOpen }"
        @keydown="handleMobileNavKeydown"
        @focusin="onAdminNavFocusIn"
      >
        <div class="admin-nav-sheet-heading">
          <div class="admin-nav-sheet-copy">
            <span class="admin-nav-sheet-kicker">工作区导航</span>
            <strong>切换模块</strong>
            <p>{{ currentAdminSection.label }} · {{ currentAdminGroup.summary }}</p>
          </div>
          <button type="button" class="admin-nav-sheet-close" @click="closeMobileNav">关闭</button>
        </div>
        
        <div ref="adminNavRef" class="admin-nav">
          <section v-for="group in adminNavGroups" :key="group.id" class="admin-nav-group">
            <div class="admin-nav-group-copy">
              <div class="admin-nav-group-title">{{ group.title }}</div>
              <div class="admin-nav-group-summary">{{ group.summary }}</div>
            </div>
            <div class="admin-nav-group-links">
              <RouterLink 
                v-for="item in group.items" 
                :key="item.to" 
                class="admin-link" 
                active-class="active" 
                :to="item.to"
              >
                {{ item.label }}
              </RouterLink>
            </div>
          </section>
        </div>
      </nav>

      <div class="admin-body">
        <RouterView />
      </div>
    </div>
  </section>
</template>

<style src="./AdminLayoutView.css"></style>
