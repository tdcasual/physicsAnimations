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
import { PAButton, PAField, PAInput, PAActions } from "@/components/ui/patterns";
</script>

<template>
  <h3>添加网页链接</h3>
  <div class="form-grid">
    <PAField>
      <template #label>分类</template>
      <select
        :value="props.linkCategoryId"
        class="flex w-full rounded-md border border-input bg-background px-3 py-2 h-10"
        :disabled="props.saving"
        @change="emit('update:linkCategoryId', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in props.groupedCategoryOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </PAField>
  </div>

  <PAField :error="props.createLinkUrlError">
    <template #label>链接</template>
    <PAInput
      :model-value="props.linkUrl"
      type="url"
      placeholder="https://example.com"
      :variant="props.createLinkUrlError ? 'error' : 'default'"
      :disabled="props.saving"
      @update:model-value="emit('update:linkUrl', $event); emit('clear-link-url-error');"
    />
  </PAField>

  <PAField>
    <template #label>标题（可选）</template>
    <PAInput
      :model-value="props.linkTitle"
      :disabled="props.saving"
      @update:model-value="emit('update:linkTitle', $event)"
    />
  </PAField>

  <details class="admin-optional-disclosure">
    <summary class="admin-optional-summary">补充描述（可选）</summary>
    <div class="admin-optional-fields">
      <PAField>
        <template #label>描述（可选）</template>
        <PAInput
          :model-value="props.linkDescription"
          type="textarea"
          size="textarea"
          :disabled="props.saving"
          @update:model-value="emit('update:linkDescription', $event)"
        />
      </PAField>
    </div>
  </details>

  <PAActions align="end">
    <PAButton :disabled="props.saving" @click="emit('submit')">添加</PAButton>
  </PAActions>
</template>
