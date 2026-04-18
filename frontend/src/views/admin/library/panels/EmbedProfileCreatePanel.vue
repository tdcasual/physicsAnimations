<script setup lang="ts">
import type { UnwrapNestedRefs } from "vue";

import type { useLibraryAdminState } from "../../../../features/library/useLibraryAdminState";

import { PAActions, PAButton, PAField, PAInput } from "@/components/ui/patterns";
defineProps<{ vm: UnwrapNestedRefs<ReturnType<typeof useLibraryAdminState>> }>();
</script>

<template>
  <div class="panel-section">
    <button type="button" class="panel-section-toggle" @click="vm.actions.togglePanelSection('embed:create')">
      <span>新增平台</span>
      <span class="asset-meta">{{ vm.actions.isPanelSectionOpen("embed:create") ? "收起" : "展开" }}</span>
    </button>
    <div v-if="vm.actions.isPanelSectionOpen('embed:create')" class="panel-section-body">
      <PAField label="平台名称" :error="vm.actions.getFieldError('createEmbedProfileName')">
        <PAInput v-model="vm.drafts.embedProfileName" :disabled="vm.ui.savingEmbed" placeholder="例如：电场仿真" />
      </PAField>
      <PAField label="embed.js 地址" :error="vm.actions.getFieldError('createEmbedScriptUrl')">
        <PAInput
          v-model="vm.drafts.embedScriptUrl"
          :disabled="vm.ui.savingEmbed"
          placeholder="例如：https://field.infinitas.fun/embed/embed.js"
        />
      </PAField>
      <PAField label="备用脚本地址（可选）">
        <PAInput
          v-model="vm.drafts.embedFallbackScriptUrl"
          :disabled="vm.ui.savingEmbed"
          placeholder="可选备用脚本 URL"
        />
      </PAField>
      <PAField label="viewerPath（可选）">
        <PAInput v-model="vm.drafts.embedViewerPath" :disabled="vm.ui.savingEmbed" placeholder="为空则自动推导 viewer.html" />
      </PAField>
      <PAField label="构造器名称">
        <PAInput v-model="vm.drafts.embedConstructorName" :disabled="vm.ui.savingEmbed" placeholder="ElectricFieldApp" />
      </PAField>
      <PAField label="资源 URL 参数键">
        <PAInput v-model="vm.drafts.embedAssetUrlOptionKey" :disabled="vm.ui.savingEmbed" placeholder="sceneUrl" />
      </PAField>
      <PAField label="允许扩展名（逗号分隔，可空）">
        <PAInput v-model="vm.drafts.embedExtensionsText" :disabled="vm.ui.savingEmbed" placeholder="json,zip,efield" />
      </PAField>
      <PAField label="默认参数 JSON" :error="vm.actions.getFieldError('createEmbedDefaultOptionsJson')">
        <PAInput v-model="vm.drafts.embedDefaultOptionsJson" type="textarea" :rows="4" :disabled="vm.ui.savingEmbed" placeholder='例如：{"mode":"view"}' />
      </PAField>
      <label class="checkbox">
        <input v-model="vm.drafts.embedEnabled" type="checkbox" :disabled="vm.ui.savingEmbed" />
        <span>启用该平台</span>
      </label>
      <PAActions align="end">
        <PAButton :disabled="vm.ui.savingEmbed" @click="vm.actions.createEmbedProfileEntry">新增 Embed 平台</PAButton>
      </PAActions>
    </div>
  </div>
</template>
