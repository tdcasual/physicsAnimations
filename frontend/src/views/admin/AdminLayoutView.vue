<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import AdminShellHeader from "../../components/admin/AdminShellHeader.vue";
import { adminNavGroups, adminNavItems } from "../../features/admin/adminNavConfig";
import { useRoute } from "vue-router";

const route = useRoute();
const adminNavRef = ref<HTMLElement | null>(null);
const adminNavShellRef = ref<HTMLElement | null>(null);
const adminNavTriggerRef = ref<HTMLElement | null>(null);
const adminHeaderRef = ref<{ focusTrigger: () => void } | null>(null);
const mobileNavOpen = ref(false);
const currentAdminGroup = computed(
  () => adminNavGroups.find((group) => group.items.some((item) => route.path.startsWith(item.to))) ?? adminNavGroups[0],
);
const currentAdminSection = computed(() => adminNavItems.find((item) => route.path.startsWith(item.to)) ?? adminNavItems[0]);

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
      <nav
        id="admin-nav-shell"
        ref="adminNavShellRef"
        class="admin-nav-bar"
        :class="{ 'is-open': mobileNavOpen }"
        @keydown="handleMobileNavKeydown"
        @focusin="onAdminNavFocusIn"
      >
        <div ref="adminNavRef" class="admin-nav">
          <section v-for="group in adminNavGroups" :key="group.id" class="admin-nav-group">
            <div class="admin-nav-group-title">{{ group.title }}</div>
            <div class="admin-nav-group-links">
              <RouterLink v-for="item in group.items" :key="item.to" class="admin-link" active-class="active" :to="item.to">
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
