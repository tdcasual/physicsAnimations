<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps<{
  currentAdminSection: {
    label: string;
    description: string;
  };
  currentAdminGroup: {
    title: string;
    summary: string;
  };
  mobileNavOpen: boolean;
}>();

const emit = defineEmits<{
  (event: "toggle-mobile-nav"): void;
}>();

const triggerButtonRef = ref<HTMLButtonElement | null>(null);

defineExpose({
  focusTrigger() {
    triggerButtonRef.value?.focus();
  },
});
</script>

<template>
  <header class="admin-shell-header admin-shell-header--compact">
    <div class="admin-shell-copy">
      <p class="admin-shell-kicker">后台工作区</p>
      <h1>管理后台</h1>
      <p class="admin-shell-description">当前模块：{{ props.currentAdminSection.label }} · {{ props.currentAdminSection.description }}</p>
      <div class="admin-shell-summary-row">
        <strong class="admin-shell-module-chip">{{ props.currentAdminSection.label }}</strong>
        <span class="admin-shell-summary-copy">{{ props.currentAdminGroup.title }} · {{ props.currentAdminGroup.summary }}</span>
      </div>
      <div class="admin-shell-status-strip">
        <span class="admin-shell-status-label">当前焦点</span>
        <strong>{{ props.currentAdminSection.label }}</strong>
        <span>优先保持当前模块连续处理，再通过工作区菜单切换。</span>
      </div>
      <p class="admin-shell-note">内容编修、资源归档和系统巡检保持同线推进。</p>
    </div>
    <div class="admin-shell-actions">
      <RouterLink class="admin-link admin-link-home" to="/">主页面</RouterLink>
      <button
        ref="triggerButtonRef"
        type="button"
        class="admin-mobile-nav-trigger"
        :aria-expanded="props.mobileNavOpen ? 'true' : 'false'"
        aria-controls="admin-nav-shell"
        @click="emit('toggle-mobile-nav')"
      >
        工作区菜单
      </button>
    </div>
  </header>
</template>

<style scoped>
.admin-shell-header {
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 20px;
  background: color-mix(in oklab, var(--surface) 94%, var(--paper));
  box-shadow: 0 24px 52px -38px color-mix(in oklab, var(--ink) 26%, transparent);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--accent) 7%, var(--surface)), color-mix(in oklab, var(--surface) 94%, var(--paper))),
    var(--surface);
}

.admin-shell-header::after {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--accent) 48%, var(--border)), transparent);
}

.admin-shell-header--compact {
  gap: 10px;
  padding: 16px 18px;
}

.admin-shell-copy {
  display: grid;
  gap: 8px;
}

.admin-shell-header--compact .admin-shell-copy {
  gap: 6px;
}

.admin-shell-kicker {
  margin: 0;
  color: var(--muted);
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.admin-shell-summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-shell-module-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid color-mix(in oklab, var(--accent) 24%, var(--border));
  border-radius: 999px;
  background: color-mix(in oklab, var(--surface) 90%, var(--paper));
  color: color-mix(in oklab, var(--accent-copper-strong) 72%, var(--text));
  font-size: calc(12px * var(--ui-scale, 1));
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-shell-summary-copy,
.admin-shell-description,
.admin-shell-note {
  color: var(--muted);
}

.admin-shell-summary-copy {
  font-size: calc(13px * var(--ui-scale, 1));
}

.admin-shell-description,
.admin-shell-note {
  margin: 0;
}

.admin-shell-note {
  max-width: 52ch;
  font-size: calc(13px * var(--ui-scale, 1));
}

.admin-shell-header--compact .admin-shell-description {
  font-size: calc(14px * var(--ui-scale, 1));
}

.admin-shell-header--compact .admin-shell-note {
  max-width: 44ch;
  font-size: calc(12px * var(--ui-scale, 1));
}

.admin-shell-status-strip {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid color-mix(in oklab, var(--accent) 20%, var(--border));
  border-radius: 16px;
  max-width: 46ch;
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--accent) 8%, var(--surface)), color-mix(in oklab, var(--surface) 94%, var(--paper))),
    var(--surface);
}

.admin-shell-header--compact .admin-shell-status-strip {
  gap: 3px;
  padding: 8px 10px;
  max-width: 40ch;
}

.admin-shell-status-label {
  margin: 0;
  color: color-mix(in oklab, var(--accent-copper-strong) 72%, var(--text));
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.admin-shell-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
