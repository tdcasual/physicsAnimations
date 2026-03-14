<script setup lang="ts">
defineProps<{ vm: any }>();
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
        <label class="field" :class="{ 'has-error': vm.actions.getFieldError('editEmbedProfileName') }">
          <span>平台名称</span>
          <input v-model="vm.drafts.embedEditName" class="field-input" type="text" :disabled="vm.ui.savingEmbed" />
          <div v-if="vm.actions.getFieldError('editEmbedProfileName')" class="field-error-text">{{ vm.actions.getFieldError("editEmbedProfileName") }}</div>
        </label>
        <label class="field" :class="{ 'has-error': vm.actions.getFieldError('editEmbedScriptUrl') }">
          <span>embed.js 地址</span>
          <input
            v-model="vm.drafts.embedEditScriptUrl"
            class="field-input"
            type="text"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            :disabled="vm.ui.savingEmbed"
          />
          <div v-if="vm.actions.getFieldError('editEmbedScriptUrl')" class="field-error-text">{{ vm.actions.getFieldError("editEmbedScriptUrl") }}</div>
        </label>
        <label class="field">
          <span>备用脚本地址（可选）</span>
          <input
            v-model="vm.drafts.embedEditFallbackScriptUrl"
            class="field-input"
            type="text"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            :disabled="vm.ui.savingEmbed"
          />
        </label>
        <label class="field">
          <span>viewerPath</span>
          <input v-model="vm.drafts.embedEditViewerPath" class="field-input" type="text" :disabled="vm.ui.savingEmbed" />
        </label>
        <label class="field">
          <span>构造器名称</span>
          <input v-model="vm.drafts.embedEditConstructorName" class="field-input" type="text" :disabled="vm.ui.savingEmbed" />
        </label>
        <label class="field">
          <span>资源 URL 参数键</span>
          <input v-model="vm.drafts.embedEditAssetUrlOptionKey" class="field-input" type="text" :disabled="vm.ui.savingEmbed" />
        </label>
        <label class="field">
          <span>允许扩展名（逗号分隔）</span>
          <input v-model="vm.drafts.embedEditExtensionsText" class="field-input" type="text" :disabled="vm.ui.savingEmbed" />
        </label>
        <label class="field" :class="{ 'has-error': vm.actions.getFieldError('editEmbedDefaultOptionsJson') }">
          <span>默认参数 JSON</span>
          <textarea v-model="vm.drafts.embedEditDefaultOptionsJson" class="field-input" rows="4" :disabled="vm.ui.savingEmbed" />
          <div v-if="vm.actions.getFieldError('editEmbedDefaultOptionsJson')" class="field-error-text">
            {{ vm.actions.getFieldError("editEmbedDefaultOptionsJson") }}
          </div>
        </label>
        <label class="field">
          <span>
            <input v-model="vm.drafts.embedEditEnabled" type="checkbox" :disabled="vm.ui.savingEmbed" />
            启用该平台
          </span>
        </label>
        <div class="asset-actions-inline">
          <button type="button" class="btn btn-primary" :disabled="vm.ui.savingEmbed" @click="vm.actions.saveEmbedProfileEdit">保存平台</button>
          <button type="button" class="btn btn-ghost" :disabled="vm.ui.savingEmbed" @click="vm.actions.cancelEmbedProfileEdit">取消</button>
        </div>
      </div>
      <div v-else class="empty">在平台列表点击“编辑”后，可在此修改平台配置。</div>
    </div>
  </div>
</template>
