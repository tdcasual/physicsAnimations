<script setup lang="ts">
import type { UnwrapNestedRefs } from "vue";

import type { useLibraryAdminState } from "../../../../features/library/useLibraryAdminState";

import { PAActions, PAButton, PAField, PAInput } from "@/components/ui/patterns";
defineProps<{ vm: UnwrapNestedRefs<ReturnType<typeof useLibraryAdminState>> }>();
</script>

<template>
  <div class="panel-section">
    <button type="button" class="panel-section-toggle" @click="vm.actions.togglePanelSection('embed:edit')">
      <span>编辑平台</span>
      <span class="asset-meta">{{ vm.actions.isPanelSectionOpen("embed:edit") ? "收起" : "展开" }}</span>
    </button>
    <div v-if="vm.actions.isPanelSectionOpen('embed:edit')" class="panel-section-body">
      <div v-if="vm.drafts.editingEmbedProfileId" class="editor-panel">
        <div class="asset-meta">平台 ID：{{ vm.drafts.editingEmbedProfileId }}</div>
        <PAField label="平台名称" :error="vm.actions.getFieldError('editEmbedProfileName')">
          <PAInput v-model="vm.drafts.embedEditName" :disabled="vm.ui.savingEmbed" />
        </PAField>
        <PAField label="embed.js 地址" :error="vm.actions.getFieldError('editEmbedScriptUrl')">
          <PAInput
            v-model="vm.drafts.embedEditScriptUrl"
            :disabled="vm.ui.savingEmbed"
          />
        </PAField>
        <PAField label="备用脚本地址（可选）">
          <PAInput
            v-model="vm.drafts.embedEditFallbackScriptUrl"
            :disabled="vm.ui.savingEmbed"
          />
        </PAField>
        <PAField label="viewerPath">
          <PAInput v-model="vm.drafts.embedEditViewerPath" :disabled="vm.ui.savingEmbed" />
        </PAField>
        <PAField label="构造器名称">
          <PAInput v-model="vm.drafts.embedEditConstructorName" :disabled="vm.ui.savingEmbed" />
        </PAField>
        <PAField label="资源 URL 参数键">
          <PAInput v-model="vm.drafts.embedEditAssetUrlOptionKey" :disabled="vm.ui.savingEmbed" />
        </PAField>
        <PAField label="允许扩展名（逗号分隔）">
          <PAInput v-model="vm.drafts.embedEditExtensionsText" :disabled="vm.ui.savingEmbed" />
        </PAField>
        <PAField label="默认参数 JSON" :error="vm.actions.getFieldError('editEmbedDefaultOptionsJson')">
          <PAInput v-model="vm.drafts.embedEditDefaultOptionsJson" type="textarea" :rows="4" :disabled="vm.ui.savingEmbed" />
        </PAField>
        <label class="checkbox">
          <input v-model="vm.drafts.embedEditEnabled" type="checkbox" :disabled="vm.ui.savingEmbed" />
          <span>启用该平台</span>
        </label>
        <PAActions align="end">
          <PAButton variant="ghost" :disabled="vm.ui.savingEmbed" @click="vm.actions.cancelEmbedProfileEdit">取消</PAButton>
          <PAButton :disabled="vm.ui.savingEmbed" @click="vm.actions.saveEmbedProfileEdit">保存平台</PAButton>
        </PAActions>
      </div>
      <div v-else class=”empty”>选择平台以编辑</div>
    </div>
  </div>
</template>
