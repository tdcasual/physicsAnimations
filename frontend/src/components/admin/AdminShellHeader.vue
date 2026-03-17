<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps<{
  currentAdminSection: {
    label: string;
    description: string;
  };
  currentAdminGroup: {
    id: string;
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
  <header class="admin-shell-header admin-shell-header--compact" :class="['admin-shell-header--dense']">
    <div class="admin-shell-copy">
      <h1>管理后台</h1>
      <p class="admin-shell-description">当前模块：{{ props.currentAdminSection.label }} · {{ props.currentAdminSection.description }}</p>
      <div class="admin-shell-summary-row">
        <strong class="admin-shell-module-chip">{{ props.currentAdminSection.label }}</strong>
        <span class="admin-shell-summary-copy">{{ props.currentAdminGroup.title }} · {{ props.currentAdminGroup.summary }}</span>
      </div>
    </div>
    <div class="admin-shell-ops">
      <div class="admin-shell-status-strip admin-shell-pulse">
        <span class="admin-shell-status-label">当前焦点</span>
        <strong>{{ props.currentAdminSection.label }}</strong>
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
    </div>
  </header>
</template>

<style scoped>
.admin-shell-header {
  position: relative;
  border: 1px solid var(--border);
  border-radius: var(--radius-l);
  background: var(--surface);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
}

.admin-shell-header--compact {
  gap: 12px;
  padding: 16px 20px;
}

.admin-shell-header--dense {
  align-items: stretch;
}

.admin-shell-header h1 {
  margin: 0;
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.admin-shell-copy {
  display: grid;
  gap: 8px;
  flex: 1 1 420px;
}

.admin-shell-header--compact .admin-shell-copy {
  gap: 6px;
}

.admin-shell-kicker {
  margin: 0;
  color: var(--muted);
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 600;
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
  min-height: 26px;
  padding: 3px 10px;
  border: 1px solid oklch(58% 0.18 30 / 0.2);
  border-radius: var(--radius-s, 4px);
  background: oklch(58% 0.18 30 / 0.06);
  color: var(--accent);
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.admin-shell-summary-copy,
.admin-shell-description,
.admin-shell-note,
.admin-shell-status-copy {
  color: var(--muted);
}

.admin-shell-summary-copy {
  font-size: calc(13px * var(--ui-scale, 1));
}

.admin-shell-description,
.admin-shell-note { margin: 0; }

.admin-shell-note {
  max-width: 50ch;
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
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-m, 6px);
  max-width: 44ch;
  background: var(--bg);
}

.admin-shell-header--compact .admin-shell-status-strip {
  gap: 3px;
  padding: 10px 12px;
  max-width: 40ch;
}

.admin-shell-status-label {
  margin: 0;
  color: var(--accent);
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-shell-ops {
  display: grid;
  align-content: start;
  justify-items: end;
  gap: 10px;
  flex: 0 1 340px;
}

.admin-shell-pulse {
  min-width: min(100%, 300px);
}

.admin-shell-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.admin-shell-actions .admin-link-home,
.admin-shell-actions .admin-mobile-nav-trigger {
  min-height: 40px;
}

@media (max-width: 900px) {
  .admin-shell-header--dense { flex-direction: column; }
  .admin-shell-ops { width: 100%; justify-items: stretch; }
  .admin-shell-actions { justify-content: flex-start; }
}

@media (max-width: 640px) {
  .admin-shell-header {
    gap: 8px;
    padding: 14px 16px;
  }

  .admin-shell-header h1 {
    font-size: clamp(1.5rem, 7vw, 2rem);
    line-height: 1.05;
  }

  .admin-shell-copy { flex: initial; gap: 4px; }
  .admin-shell-kicker { display: none; }
  .admin-shell-summary-row { display: none; }

  .admin-shell-description,
  .admin-shell-note,
  .admin-shell-summary-copy,
  .admin-shell-status-copy { display: none; }

  .admin-shell-ops {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    flex: initial;
    gap: 8px;
    width: 100%;
  }

  .admin-shell-status-strip {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 6px;
    padding: 6px 9px;
    max-width: none;
    min-width: 0;
  }

  .admin-shell-status-label { display: none; }

  .admin-shell-status-strip strong {
    line-height: 1.1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .admin-shell-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: stretch;
    width: auto;
  }

  .admin-link-home { display: none; }

  .admin-shell-actions .admin-link-home,
  .admin-shell-actions .admin-mobile-nav-trigger { min-height: 38px; }

  .admin-shell-actions .admin-mobile-nav-trigger {
    padding-inline: 14px;
    white-space: nowrap;
  }
}
</style>
