<script setup lang="ts">
import { type VariantProps, cva } from "class-variance-authority";
import { computed } from "vue";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        error: "border-destructive focus-visible:ring-destructive",
      },
      size: {
        default: "h-10",
        sm: "h-8 px-2 text-xs",
        lg: "h-12 px-4",
        textarea: "min-h-[80px] resize-y",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type InputVariants = VariantProps<typeof inputVariants>;

interface Props {
  variant?: InputVariants["variant"];
  size?: InputVariants["size"];
  class?: string;
  modelValue?: string | number;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  autocomplete?: string;
  autocapitalize?: string;
  autocorrect?: string;
  spellcheck?: boolean | "true" | "false" | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  size: "default",
  autocapitalize: "none",
  autocorrect: "off",
  spellcheck: "false",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const classes = computed(() => cn(inputVariants({ variant: props.variant, size: props.size }), props.class));

function onInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  emit("update:modelValue", target.value);
}
</script>

<template>
  <input
    v-if="type !== 'textarea'"
    :type="type"
    :class="classes"
    :value="modelValue"
    :disabled="disabled"
    :placeholder="placeholder"
    :name="name"
    :autocomplete="autocomplete"
    :autocapitalize="autocapitalize"
    :autocorrect="autocorrect"
    :spellcheck="spellcheck"
    @input="onInput"
  />
  <textarea
    v-else
    :class="classes"
    :value="modelValue"
    :disabled="disabled"
    :placeholder="placeholder"
    :name="name"
    :autocomplete="autocomplete"
    :autocapitalize="autocapitalize"
    :autocorrect="autocorrect"
    :spellcheck="spellcheck"
    @input="onInput"
  />
</template>
