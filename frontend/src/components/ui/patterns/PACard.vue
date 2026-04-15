<script setup lang="ts">
import { computed } from "vue";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  // Base styles
  "rounded-xl border p-5 shadow-sm transition-all",
  {
    variants: {
      variant: {
        default: "bg-card border-border",
        admin: "bg-gradient-to-br from-card to-muted border-border hover:shadow-md",
        outline: "bg-transparent border-border",
        ghost: "bg-transparent border-transparent shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type CardVariants = VariantProps<typeof cardVariants>;

interface Props {
  variant?: CardVariants["variant"];
  class?: string;
  as?: "div" | "form" | "section" | "article";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
  as: "div",
});

const classes = computed(() => cn(cardVariants({ variant: props.variant }), props.class));
</script>

<template>
  <component :is="as" :class="classes">
    <slot />
  </component>
</template>
