<script setup lang="ts">
interface OptionItem {
  value: string;
  label: string;
}

const props = defineProps<{
  categoryOptions: OptionItem[];
  categoryId: string;
  title: string;
  description: string;
  saving: boolean;
  uploadFileError: string;
}>();

const emit = defineEmits<{
  "update:categoryId": [value: string];
  "file-change": [file: File | null];
  "update:title": [value: string];
  "update:description": [value: string];
  submit: [];
}>();

function onInputFile(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("file-change", target.files?.[0] || null);
}
</script>

<template>
  <h3>上传 HTML / ZIP</h3>

  <div class="form-grid">
    <label class="field">
      <span>分类</span>
      <select
        :value="props.categoryId"
        class="field-input"
        @change="emit('update:categoryId', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in props.categoryOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </label>
  </div>

  <label class="field" :class="{ 'has-error': props.uploadFileError }">
    <span>文件（HTML / ZIP）</span>
    <input
      id="upload-file-input"
      class="field-input"
      type="file"
      accept=".html,.htm,.zip,text/html,application/zip"
      @change="onInputFile"
    />
    <div v-if="props.uploadFileError" class="field-error-text">{{ props.uploadFileError }}</div>
  </label>

  <label class="field">
    <span>标题（可选）</span>
    <input
      :value="props.title"
      class="field-input"
      type="text"
      @input="emit('update:title', ($event.target as HTMLInputElement).value)"
    />
  </label>

  <label class="field">
    <span>描述（可选）</span>
    <textarea
      :value="props.description"
      class="field-input field-textarea"
      @input="emit('update:description', ($event.target as HTMLTextAreaElement).value)"
    />
  </label>

  <div class="actions admin-actions">
    <button type="button" class="btn btn-primary" :disabled="props.saving" @click="emit('submit')">上传</button>
  </div>
</template>
