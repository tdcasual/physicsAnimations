<script setup lang="ts">
const props = defineProps<{
  heroTitle: string;
  heroDescription: string;
  query: string;
  continueBrowseHref: string;
  secondaryBrowseHref: string;
  secondaryBrowseLabel: string;
  heroStatusItems: string[];
}>();

const emit = defineEmits<{
  (event: "update:query", value: string): void;
}>();

function onQueryInput(event: Event) {
  emit("update:query", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <section class="catalog-hero" :class="'catalog-stage-hero'">
    <div class="catalog-hero-mainline">
      <div class="catalog-hero-copy">
        <h1 class="catalog-hero-title">{{ props.heroTitle }}</h1>
        <p class="catalog-hero-description">{{ props.heroDescription }}</p>
      </div>
      <div class="catalog-hero-toolbar">
        <div class="catalog-hero-search">
          <label class="catalog-search-field catalog-search-field--toolbar">
            <span class="catalog-search-label">快速搜索</span>
            <input
              :value="props.query"
              class="catalog-search"
              type="search"
              placeholder="搜索标题 / 描述..."
              autocomplete="off"
              @input="onQueryInput"
            />
          </label>
        </div>
        <div class="catalog-hero-actions">
          <a :href="props.continueBrowseHref" class="btn btn-primary">继续浏览</a>
          <a :href="props.secondaryBrowseHref" class="btn btn-ghost">{{ props.secondaryBrowseLabel }}</a>
        </div>
      </div>
    </div>
    <div class="catalog-hero-support catalog-hero-support--status">
      <div class="catalog-hero-status-strip" aria-label="当前浏览状态">
        <span
          v-for="(item, index) in props.heroStatusItems"
          :key="`${index}-${item}`"
          :class="['catalog-hero-status-item', { 'catalog-hero-status-item--lead': index === 0 }]"
        >
          {{ item }}
        </span>
      </div>
    </div>
  </section>
</template>
