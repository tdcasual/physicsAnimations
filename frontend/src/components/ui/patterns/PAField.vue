<script setup lang="ts">
import { type VariantProps, cva } from "class-variance-authority";
import { computed } from "vue";

import { cn } from "@/lib/utils";

const fieldVariants = cva(
  "grid gap-1.5 text-sm",
  {
    variants: {
      state: {
        default: "",
        error: "[&_input]:border-destructive",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

type FieldVariants = VariantProps<typeof fieldVariants>;

interface Props {
  state?: FieldVariants["state"];
  class?: string;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  state: "default",
});

const classes = computed(() => cn(fieldVariants({ state: props.state }), props.class));
</script>

<template>
  <label :class="classes">
    <slot name="label" />
    <slot />
    <span v-if="error" class="text-xs text-destructive">{{ error }}</span>
  </label>
</template>
