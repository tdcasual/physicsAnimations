<script setup lang="ts">
import { type VariantProps, cva } from "class-variance-authority";
import { computed } from "vue";

import { cn } from "@/lib/utils";

const actionsVariants = cva(
  "flex gap-2 flex-wrap",
  {
    variants: {
      align: {
        start: "justify-start",
        end: "justify-end",
        center: "justify-center",
        stretch: "[&>*]:flex-1",
      },
    },
    defaultVariants: {
      align: "end",
    },
  }
);

type ActionsVariants = VariantProps<typeof actionsVariants>;

interface Props {
  align?: ActionsVariants["align"];
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  align: "end",
});

const classes = computed(() => cn(actionsVariants({ align: props.align }), props.class));
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
