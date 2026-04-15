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
import { PAButton, PAField, PAInput, PAActions } from "@/components/ui/patterns";
</script>

<template>
  <h3>上传 HTML / ZIP</h3>

  <div class="form-grid">
    <PAField>
      <template #label>分类</template>
      <select
        :value="props.categoryId"
        class="flex w-full rounded-md border border-input bg-background px-3 py-2 h-10"
        :disabled="props.saving"
        @change="emit('update:categoryId', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in props.categoryOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </PAField>
  </div>

  <PAField :error="props.uploadFileError">
    <template #label>文件（HTML / ZIP）</template>
    <input
      id="upload-file-input"
      class="flex w-full rounded-md border border-input bg-background px-3 py-2 h-10 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
      :class="props.uploadFileError ? 'border-destructive' : ''"
      type="file"
      accept=".html,.htm,.zip,text/html,application/zip"
      :disabled="props.saving"
      @change="onInputFile"
    />
  </PAField>

  <PAField>
    <template #label>标题（可选）</template>
    <PAInput
      :model-value="props.title"
      :disabled="props.saving"
      @update:model-value="emit('update:title', $event)"
    />
  </PAField>

  <details class="admin-optional-disclosure">
    <summary class="admin-optional-summary">补充描述（可选）</summary>
    <div class="admin-optional-fields">
      <PAField>
        <template #label>描述（可选）</template>
        <PAInput
          :model-value="props.description"
          type="textarea"
          size="textarea"
          :disabled="props.saving"
          @update:model-value="emit('update:description', $event)"
        />
      </PAField>
    </div>
  </details>

  <PAActions align="end">
    <PAButton :disabled="props.saving" @click="emit('submit')">上传</PAButton>
  </PAActions>
</template>
