<script setup lang="ts">
defineProps<{ vm: any }>();
</script>

<template>
  <div class="panel-section">
    <button type="button" class="panel-section-toggle" @click="vm.actions.togglePanelSection('embed:create')">
      <span>新增平台</span>
      <span class="asset-meta">{{ vm.actions.isPanelSectionOpen("embed:create") ? "收起" : "展开" }}</span>
    </button>
    <div v-if="vm.actions.isPanelSectionOpen('embed:create')" class="panel-section-body">
      <label class="field" :class="{ 'has-error': vm.actions.getFieldError('createEmbedProfileName') }">
        <span>平台名称</span>
        <input v-model="vm.drafts.embedProfileName" class="field-input" type="text" :disabled="vm.ui.savingEmbed" placeholder="例如：电场仿真" />
        <div v-if="vm.actions.getFieldError('createEmbedProfileName')" class="field-error-text">{{ vm.actions.getFieldError("createEmbedProfileName") }}</div>
      </label>
      <label class="field" :class="{ 'has-error': vm.actions.getFieldError('createEmbedScriptUrl') }">
        <span>embed.js 地址</span>
        <input
          v-model="vm.drafts.embedScriptUrl"
          class="field-input"
          type="text"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :disabled="vm.ui.savingEmbed"
          placeholder="例如：https://field.infinitas.fun/embed/embed.js"
        />
        <div v-if="vm.actions.getFieldError('createEmbedScriptUrl')" class="field-error-text">{{ vm.actions.getFieldError("createEmbedScriptUrl") }}</div>
      </label>
      <label class="field">
        <span>备用脚本地址（可选）</span>
        <input
          v-model="vm.drafts.embedFallbackScriptUrl"
          class="field-input"
          type="text"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :disabled="vm.ui.savingEmbed"
          placeholder="可选备用脚本 URL"
        />
      </label>
      <label class="field">
        <span>viewerPath（可选）</span>
        <input v-model="vm.drafts.embedViewerPath" class="field-input" type="text" :disabled="vm.ui.savingEmbed" placeholder="为空则自动推导 viewer.html" />
      </label>
      <label class="field">
        <span>构造器名称</span>
        <input v-model="vm.drafts.embedConstructorName" class="field-input" type="text" :disabled="vm.ui.savingEmbed" placeholder="ElectricFieldApp" />
      </label>
      <label class="field">
        <span>资源 URL 参数键</span>
        <input v-model="vm.drafts.embedAssetUrlOptionKey" class="field-input" type="text" :disabled="vm.ui.savingEmbed" placeholder="sceneUrl" />
      </label>
      <label class="field">
        <span>允许扩展名（逗号分隔，可空）</span>
        <input v-model="vm.drafts.embedExtensionsText" class="field-input" type="text" :disabled="vm.ui.savingEmbed" placeholder="json,zip,efield" />
      </label>
      <label class="field" :class="{ 'has-error': vm.actions.getFieldError('createEmbedDefaultOptionsJson') }">
        <span>默认参数 JSON</span>
        <textarea v-model="vm.drafts.embedDefaultOptionsJson" class="field-input" rows="4" :disabled="vm.ui.savingEmbed" placeholder='例如：{"mode":"view"}' />
        <div v-if="vm.actions.getFieldError('createEmbedDefaultOptionsJson')" class="field-error-text">
          {{ vm.actions.getFieldError("createEmbedDefaultOptionsJson") }}
        </div>
      </label>
      <label class="field">
        <span>
          <input v-model="vm.drafts.embedEnabled" type="checkbox" :disabled="vm.ui.savingEmbed" />
          启用该平台
        </span>
      </label>
      <div class="admin-actions">
        <button type="button" class="btn btn-primary" :disabled="vm.ui.savingEmbed" @click="vm.actions.createEmbedProfileEntry">新增 Embed 平台</button>
      </div>
    </div>
  </div>
</template>
