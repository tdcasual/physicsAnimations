// 主题类型
export type Theme = 'light' | 'dark' | 'system'
export type ClassroomMode = 'on' | 'off'

const THEME_KEY = 'pa_theme'
const CLASSROOM_KEY = 'pa_classroom'

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

// 初始化（启动时调用）
export function initTheme(): { theme: Theme; classroom: ClassroomMode } {
  const savedTheme = safeGetItem(THEME_KEY) as Theme | null
  const savedClassroom = safeGetItem(CLASSROOM_KEY) as ClassroomMode | null

  const theme: Theme = savedTheme || 'system'
  const classroom: ClassroomMode = savedClassroom || 'off'

  applyTheme(theme)
  applyClassroomMode(classroom)

  if (theme === 'system' && typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (document.documentElement) {
        document.documentElement.dataset.theme = e.matches ? 'dark' : 'light'
      }
    })
  }

  return { theme, classroom }
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
