<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { setLocale, supportedLocales, type Locale } from '../i18n'

  /**
   * 语言切换组件
   *
   * 切换应用显示语言
   */
  const { locale } = useI18n()

  function handleChange(event: Event) {
    const newLocale = (event.target as HTMLSelectElement).value as Locale
    setLocale(newLocale)
  }
</script>

<template>
  <div class="lang-switcher">
    <label for="lang-select" class="lang-label">
      <svg
        class="lang-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
      <span class="sr-only">{{ $t('common.selectLanguage') || '选择语言' }}</span>
    </label>
    <select id="lang-select" :value="locale" class="lang-select" @change="handleChange">
      <option v-for="lang in supportedLocales" :key="lang.value" :value="lang.value">
        {{ lang.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
  .lang-switcher {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lang-label {
    display: flex;
    align-items: center;
    color: var(--text-secondary, #6b7280);
  }

  .lang-icon {
    flex-shrink: 0;
  }

  .lang-select {
    padding: 6px 28px 6px 12px;
    border: 1px solid var(--border-default, #e5e7eb);
    border-radius: 8px;
    background: var(--surface-page, #ffffff);
    color: var(--text-primary, #111827);
    font-size: 14px;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
  }

  .lang-select:hover {
    border-color: var(--primary-7, #6366f1);
  }

  .lang-select:focus {
    outline: none;
    border-color: var(--primary-8, #4f46e5);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
