<script setup lang="ts">
interface HeroOverviewCard {
  label: string;
  title: string;
  note: string;
}

interface HeroMapItem {
  step: string;
  title: string;
  description: string;
}

const props = defineProps<{
  heroTitle: string;
  heroDescription: string;
  query: string;
  continueBrowseHref: string;
  secondaryBrowseHref: string;
  secondaryBrowseLabel: string;
  heroOverviewCards: HeroOverviewCard[];
  heroMapItems: HeroMapItem[];
}>();

const emit = defineEmits<{
  (event: "update:query", value: string): void;
}>();

function onQueryInput(event: Event) {
  emit("update:query", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <section class="catalog-hero">
    <div class="catalog-hero-copy">
      <div class="catalog-hero-kicker">教学实验图谱</div>
      <h1 class="catalog-hero-title">{{ props.heroTitle }}</h1>
      <p class="catalog-hero-description">{{ props.heroDescription }}</p>
      <p class="catalog-hero-note">先定课堂目标，再继续浏览或按需补资源。</p>
    </div>
    <div class="catalog-hero-primary">
      <div class="catalog-hero-search">
        <label class="catalog-search-field">
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
    <div class="catalog-hero-support">
      <div class="catalog-hero-overview" aria-label="当前浏览提示">
        <article v-for="item in props.heroOverviewCards" :key="item.label" class="catalog-overview-card">
          <div class="catalog-overview-label">{{ item.label }}</div>
          <strong>{{ item.title }}</strong>
          <span>{{ item.note }}</span>
        </article>
      </div>
      <div class="catalog-hero-map" aria-label="浏览地图">
        <div class="catalog-map-heading">浏览提示</div>
        <div class="catalog-map-grid">
          <article v-for="item in props.heroMapItems" :key="item.step" class="catalog-map-item">
            <div class="catalog-map-step">{{ item.step }}</div>
            <div class="catalog-map-copy">
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.catalog-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 20px;
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--surface) 90%, var(--paper)), color-mix(in oklab, var(--accent) 8%, var(--surface))),
    var(--surface);
  box-shadow: 0 24px 52px -36px color-mix(in oklab, var(--ink) 26%, transparent);
  padding: clamp(18px, 2vw, 24px);
  display: grid;
  gap: 16px 20px;
}

.catalog-hero::before {
  content: "";
  position: absolute;
  inset: -28% auto auto -4%;
  width: 360px;
  height: 360px;
  border-radius: 999px;
  background: radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%);
  pointer-events: none;
}

.catalog-hero::after {
  content: "";
  position: absolute;
  inset: auto 20px 20px auto;
  width: min(240px, 42%);
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--accent-copper) 56%, var(--border)) 60%, transparent);
}

.catalog-hero-copy,
.catalog-hero-search,
.catalog-hero-overview,
.catalog-hero-map,
.catalog-hero-actions,
.catalog-hero-primary,
.catalog-hero-support {
  position: relative;
  z-index: 1;
}

.catalog-hero-primary,
.catalog-hero-support {
  display: grid;
  gap: 12px;
}

.catalog-hero-copy {
  animation: catalog-hero-rise 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.catalog-hero-search {
  animation: catalog-hero-rise 560ms 70ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.catalog-hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  animation: catalog-hero-rise 560ms 100ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.catalog-hero-actions .btn {
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.catalog-hero-actions .btn:hover {
  transform: translateY(-1px);
}

.catalog-hero-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  animation: catalog-hero-rise 560ms 140ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.catalog-hero-map {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid color-mix(in oklab, var(--accent-copper) 20%, var(--border));
  border-radius: 18px;
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--accent-copper) 8%, var(--surface)), color-mix(in oklab, var(--surface) 92%, var(--paper))),
    var(--surface);
  animation: catalog-hero-rise 560ms 200ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.catalog-hero-kicker {
  color: color-mix(in oklab, var(--accent-copper-strong) 78%, var(--text));
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.catalog-hero-title {
  margin: 0;
  font-family: "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(1.7rem, 1.2rem + 1vw, 2.45rem);
  line-height: 1.06;
  letter-spacing: -0.04em;
}

.catalog-hero-description {
  margin: 0;
  color: var(--muted);
  font-size: calc(14px * var(--ui-scale, 1));
  max-width: 56ch;
}

.catalog-hero-note {
  margin: 0;
  color: color-mix(in oklab, var(--muted) 78%, var(--text));
  font-size: calc(13px * var(--ui-scale, 1));
  max-width: 48ch;
}

.catalog-overview-card {
  display: grid;
  gap: 6px;
  min-height: 100%;
  padding: 12px 12px 14px;
  border: 1px solid color-mix(in oklab, var(--accent) 16%, var(--border));
  border-radius: 16px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface) 96%, var(--paper)), color-mix(in oklab, var(--accent) 6%, var(--surface))),
    var(--surface);
  box-shadow: inset 0 1px 0 color-mix(in oklab, var(--paper-strong) 64%, transparent);
}

.catalog-overview-card:first-child {
  border-color: color-mix(in oklab, var(--accent) 28%, var(--border));
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--accent) 10%, var(--surface)), color-mix(in oklab, var(--surface) 93%, var(--paper))),
    var(--surface);
}

.catalog-overview-label {
  color: color-mix(in oklab, var(--accent-copper-strong) 76%, var(--text));
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.catalog-overview-card strong {
  font-size: calc(15px * var(--ui-scale, 1));
  line-height: 1.22;
}

.catalog-overview-card span {
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale, 1));
  line-height: 1.45;
}

.catalog-search-field {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid color-mix(in oklab, var(--line-strong) 14%, var(--border));
  border-radius: 18px;
  background: color-mix(in oklab, var(--surface) 88%, var(--paper));
}

.catalog-search-label,
.catalog-map-heading {
  font-size: calc(12px * var(--ui-scale, 1));
  color: color-mix(in oklab, var(--muted) 88%, var(--text));
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.catalog-search {
  width: min(560px, 100%);
  border: 1px solid color-mix(in oklab, var(--line-strong) 14%, var(--border));
  border-radius: 999px;
  min-height: 46px;
  padding: 10px 14px;
  background: color-mix(in oklab, var(--paper) 70%, var(--surface));
  color: var(--text);
  font-size: calc(14px * var(--ui-scale, 1));
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.catalog-search:focus-visible {
  outline: none;
  border-color: color-mix(in oklab, var(--accent) 56%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 15%, transparent);
}

.catalog-map-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.catalog-map-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: flex-start;
}

.catalog-map-step {
  min-inline-size: 2.4rem;
  padding-top: 2px;
  color: color-mix(in oklab, var(--accent) 80%, var(--text));
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.12em;
}

.catalog-map-copy {
  display: grid;
  gap: 4px;
}

.catalog-map-copy strong {
  font-size: calc(15px * var(--ui-scale, 1));
}

.catalog-map-copy span {
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale, 1));
}

@keyframes catalog-hero-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (min-width: 980px) {
  .catalog-hero {
    grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
    align-items: start;
  }

  .catalog-hero-map {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .catalog-hero {
    padding: 14px;
  }

  .catalog-hero-overview,
  .catalog-map-grid {
    grid-template-columns: 1fr;
  }

  .catalog-hero-actions .btn {
    width: 100%;
    justify-content: center;
  }

  .catalog-map-grid {
    gap: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .catalog-hero-copy,
  .catalog-hero-search,
  .catalog-hero-overview,
  .catalog-hero-map,
  .catalog-hero-actions {
    animation: none;
  }

  .catalog-hero-actions .btn {
    transition: none;
  }
}
</style>
