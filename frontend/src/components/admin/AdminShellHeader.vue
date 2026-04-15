<script setup lang="ts">
import { RouterLink } from "vue-router";
import { LayoutDashboard, ArrowLeft } from "lucide-vue-next";
import { Button } from "@/components/ui/button";

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
}>();
</script>

<template>
  <header class="admin-shell-header" :class="['admin-shell-header--dense']">
    <div class="admin-shell-copy">
      <div class="flex items-center gap-2">
        <div class="admin-shell-icon">
          <LayoutDashboard class="h-4 w-4" />
        </div>
        <span class="admin-shell-mobile-context">{{ props.currentAdminGroup.title }}</span>
      </div>
      <h1 class="admin-shell-title">
        <span class="admin-shell-title-desktop">管理后台</span>
        <span class="admin-shell-title-mobile">{{ props.currentAdminSection.label }}</span>
      </h1>
      <p class="admin-shell-description">当前模块：{{ props.currentAdminSection.label }} · {{ props.currentAdminSection.description }}</p>
      <div class="admin-shell-summary-row">
        <span class="admin-shell-module-chip">{{ props.currentAdminSection.label }}</span>
        <span class="admin-shell-summary-copy">{{ props.currentAdminGroup.title }} · {{ props.currentAdminGroup.summary }}</span>
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
          <Button variant="outline" size="sm" as-child class="gap-2 rounded-full">
            <RouterLink to="/">
              <ArrowLeft class="h-4 w-4" />
              <span class="admin-link-home-text">主页面</span>
            </RouterLink>
          </Button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped src="./AdminShellHeader.css"></style>
