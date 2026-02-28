<script setup lang="ts">
interface OptionItem {
  value: string;
  label: string;
}

const props = defineProps<{
  groupedCategoryOptions: OptionItem[];
  linkCategoryId: string;
  linkUrl: string;
  linkTitle: string;
  linkDescription: string;
  saving: boolean;
  createLinkUrlError: string;
}>();

const emit = defineEmits<{
  "update:linkCategoryId": [value: string];
  "update:linkUrl": [value: string];
  "update:linkTitle": [value: string];
  "update:linkDescription": [value: string];
  "clear-link-url-error": [];
  submit: [];
}>();
</script>

<template>
  <h3>添加网页链接</h3>
  <div class="form-grid">
    <label class="field">
      <span>分类</span>
      <select
        :value="props.linkCategoryId"
        class="field-input"
        @change="emit('update:linkCategoryId', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in props.groupedCategoryOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </label>
  </div>

  <label class="field" :class="{ 'has-error': props.createLinkUrlError }">
    <span>链接</span>
    <input
      :value="props.linkUrl"
      class="field-input"
      type="url"
      autocapitalize="none"
      autocorrect="off"
      spellcheck="false"
      placeholder="https://example.com"
      @input="
        emit('update:linkUrl', ($event.target as HTMLInputElement).value);
        emit('clear-link-url-error');
      "
    />
    <div v-if="props.createLinkUrlError" class="field-error-text">{{ props.createLinkUrlError }}</div>
  </label>

  <label class="field">
    <span>标题（可选）</span>
    <input
      :value="props.linkTitle"
      class="field-input"
      type="text"
      @input="emit('update:linkTitle', ($event.target as HTMLInputElement).value)"
    />
  </label>

  <label class="field">
    <span>描述（可选）</span>
    <textarea
      :value="props.linkDescription"
      class="field-input field-textarea"
      @input="emit('update:linkDescription', ($event.target as HTMLTextAreaElement).value)"
    />
  </label>

  <div class="actions admin-actions">
    <button type="button" class="btn btn-primary" :disabled="props.saving" @click="emit('submit')">添加</button>
  </div>
</template>
