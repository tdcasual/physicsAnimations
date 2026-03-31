import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'

export type Locale = 'zh-CN' | 'en'
export type MessageSchema = typeof zhCN

const messages = {
  'zh-CN': zhCN,
  en: en,
}

// 从 localStorage 读取保存的语言设置
function getSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem('app-locale')
    if (saved && saved in messages) {
      return saved as Locale
    }
  } catch {
    // localStorage 不可用
  }
  return 'zh-CN'
}

// 从浏览器语言检测
function detectBrowserLocale(): Locale {
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) {
    return 'zh-CN'
  }
  if (browserLang.startsWith('en')) {
    return 'en'
  }
  return 'zh-CN'
}

// 获取初始语言
function getInitialLocale(): Locale {
  return getSavedLocale() || detectBrowserLocale()
}

export const i18n = createI18n<[MessageSchema], Locale>({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'zh-CN',
  messages,
  globalInjection: true,
  datetimeFormats: {
    'zh-CN': {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      },
    },
    en: {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      },
    },
  },
  numberFormats: {
    'zh-CN': {
      currency: {
        style: 'currency',
        currency: 'CNY',
        notation: 'standard',
      },
    },
    en: {
      currency: {
        style: 'currency',
        currency: 'USD',
        notation: 'standard',
      },
    },
  },
})

// 切换语言
export function setLocale(locale: Locale): void {
  ;(i18n.global.locale as unknown as { value: Locale }).value = locale
  try {
    localStorage.setItem('app-locale', locale)
  } catch {
    // localStorage 不可用
  }
  // 更新 HTML lang 属性
  document.documentElement.setAttribute('lang', locale)
}

// 获取当前语言
export function getLocale(): Locale {
  return (i18n.global.locale as unknown as { value: Locale }).value
}

// 获取支持的语言列表
export const supportedLocales: { value: Locale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

export default i18n
