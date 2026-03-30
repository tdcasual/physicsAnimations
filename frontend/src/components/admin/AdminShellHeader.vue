<script setup lang="ts">
  import { RouterLink } from 'vue-router'

  const props = defineProps<{
    currentAdminSection: {
      label: string
      description: string
    }
    currentAdminGroup: {
      id: string
      title: string
      summary: string
    }
  }>()
</script>

<template>
  <header
    class="admin-shell-header admin-shell-header--compact"
    :class="['admin-shell-header--dense']"
  >
    <div class="admin-shell-copy">
      <span class="admin-shell-mobile-context">{{ props.currentAdminGroup.title }}</span>
      <h1 class="admin-shell-title">
        <span class="admin-shell-title-desktop">管理后台</span>
        <span class="admin-shell-title-mobile">{{ props.currentAdminSection.label }}</span>
      </h1>
      <p class="admin-shell-description"
        >当前模块：{{ props.currentAdminSection.label }} ·
        {{ props.currentAdminSection.description }}</p
      >
      <div class="admin-shell-summary-row">
        <strong class="admin-shell-module-chip">{{ props.currentAdminSection.label }}</strong>
        <span class="admin-shell-summary-copy"
          >{{ props.currentAdminGroup.title }} · {{ props.currentAdminGroup.summary }}</span
        >
      </div>
    </div>
    <div class="admin-shell-ops">
      <div class="admin-shell-toolbar">
        <div class="admin-shell-status-strip admin-shell-pulse">
          <span class="admin-shell-status-label">当前焦点</span>
          <strong>{{ props.currentAdminSection.label }}</strong>
          <span class="admin-shell-status-copy">{{ props.currentAdminGroup.summary }}</span>
        </div>
        <div class="admin-shell-actions">
          <RouterLink class="admin-link admin-link-home" to="/">主页面</RouterLink>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped src="./AdminShellHeader.css"></style>
