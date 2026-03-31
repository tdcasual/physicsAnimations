// 主题类型
export type Theme = 'light' | 'dark' | 'system'
export type ClassroomMode = 'on' | 'off'

const THEME_KEY = 'pa_theme'
const CLASSROOM_KEY = 'pa_classroom'

// 保存主题变化监听器引用，用于清理
let themeChangeHandler: ((e: MediaQueryListEvent) => void) | null = null
let mediaQueryList: MediaQueryList | null = null
let initThemeCallCount = 0

// 安全的 localStorage 操作
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 忽略存储错误（隐私模式等）
  }
}

// 获取系统偏好
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 应用主题
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  if (theme === 'system') {
    const systemTheme = getSystemTheme()
    root.dataset.theme = systemTheme
  } else {
    root.dataset.theme = theme
  }

  safeSetItem(THEME_KEY, theme)
}

// 应用课堂模式
export function applyClassroomMode(mode: ClassroomMode): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  if (mode === 'on') {
    root.dataset.classroom = 'on'
  } else {
    delete root.dataset.classroom
  }

  safeSetItem(CLASSROOM_KEY, mode)
}

// 清理主题监听器（用于防止内存泄漏）
export function cleanupThemeListener(): void {
  if (themeChangeHandler && mediaQueryList) {
    mediaQueryList.removeEventListener('change', themeChangeHandler)
    themeChangeHandler = null
    mediaQueryList = null
  }
  // 重置引用计数，避免状态不一致
  initThemeCallCount = 0
}

// 初始化（启动时调用）
export function initTheme(): { theme: Theme; classroom: ClassroomMode } {
  const savedTheme = safeGetItem(THEME_KEY) as Theme | null
  const savedClassroom = safeGetItem(CLASSROOM_KEY) as ClassroomMode | null

  const theme: Theme = savedTheme || 'system'
  const classroom: ClassroomMode = savedClassroom || 'off'

  applyTheme(theme)
  applyClassroomMode(classroom)

  // 引用计数，防止多实例互相干扰
  initThemeCallCount++

  // 只在第一次调用时设置监听器
  if (initThemeCallCount === 1 && theme === 'system' && typeof window !== 'undefined') {
    mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
    themeChangeHandler = (e: MediaQueryListEvent) => {
      if (document.documentElement) {
        document.documentElement.dataset.theme = e.matches ? 'dark' : 'light'
      }
    }
    mediaQueryList.addEventListener('change', themeChangeHandler)
  }

  return { theme, classroom }
}

// 清理主题（与 initTheme 成对调用）
export function cleanupTheme(): void {
  initThemeCallCount = Math.max(0, initThemeCallCount - 1)
  // 只有最后一个调用者才实际清理监听器
  if (initThemeCallCount === 0) {
    cleanupThemeListener()
  }
}

// 切换主题
export function toggleTheme(current: Theme): Theme {
  const themes: Theme[] = ['light', 'dark', 'system']
  const currentIndex = themes.indexOf(current)
  const next = themes[(currentIndex + 1) % themes.length]
  applyTheme(next)
  return next
}

// 切换课堂模式
export function toggleClassroomMode(current: ClassroomMode): ClassroomMode {
  const next: ClassroomMode = current === 'on' ? 'off' : 'on'
  applyClassroomMode(next)
  return next
}

// 获取当前生效的主题
export function getEffectiveTheme(): 'light' | 'dark' {
  const saved = safeGetItem(THEME_KEY) as Theme | null

  if (saved === 'system' || !saved) {
    return getSystemTheme()
  }

  return saved as 'light' | 'dark'
}
