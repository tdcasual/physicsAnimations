/**
 * 无障碍 (Accessibility) 工具函数
 *
 * 提供无障碍相关的实用功能
 */

/**
 * 生成唯一的 ID
 * 用于关联 label 和 input 等元素
 */
export function generateId(prefix = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 检查颜色对比度是否符合 WCAG 标准
 *
 * @param foreground 前景色 (HEX, RGB, 或颜色名称)
 * @param background 背景色
 * @returns 对比度比率
 */
export function getContrastRatio(foreground: string, background: string): number {
  const lum1 = getLuminance(foreground)
  const lum2 = getLuminance(background)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * 检查对比度是否通过 WCAG AA 标准
 * 正常文本需要 4.5:1，大文本需要 3:1
 */
export function meetsContrastStandard(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  return isLargeText ? ratio >= 3 : ratio >= 4.5
}

/**
 * 计算颜色的相对亮度
 */
function getLuminance(color: string): number {
  const rgb = parseColor(color)
  if (!rgb) return 0

  const [r, g, b] = rgb.map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * 解析颜色为 RGB 数组
 */
function parseColor(color: string): [number, number, number] | null {
  // HEX
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      return [r, g, b]
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return [r, g, b]
    }
  }

  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])]
  }

  return null
}

/**
 * 键盘快捷键处理
 */
export function handleKeyboardShortcut(
  event: KeyboardEvent,
  shortcuts: Record<string, () => void>
): void {
  const key = event.key.toLowerCase()
  const modifiers = []
  if (event.ctrlKey) modifiers.push('ctrl')
  if (event.metaKey) modifiers.push('meta')
  if (event.altKey) modifiers.push('alt')
  if (event.shiftKey) modifiers.push('shift')

  const shortcutKey = [...modifiers, key].join('+')

  if (shortcuts[shortcutKey]) {
    event.preventDefault()
    shortcuts[shortcutKey]()
  }
}

/**
 * 常见的键盘快捷键
 */
export const commonShortcuts = {
  escape: 'escape',
  enter: 'enter',
  space: ' ',
  tab: 'tab',
  arrowUp: 'arrowup',
  arrowDown: 'arrowdown',
  arrowLeft: 'arrowleft',
  arrowRight: 'arrowright',
  home: 'home',
  end: 'end',
  pageUp: 'pageup',
  pageDown: 'pagedown',
  ctrlS: 'ctrl+s',
  ctrlF: 'ctrl+f',
} as const

/**
 * ARIA 角色映射
 * 帮助理解常用 ARIA 角色的用途
 */
export const ariaRoles = {
  //  landmarks
  banner: '页面横幅，通常包含网站名称和主导航',
  navigation: '导航链接集合',
  main: '文档的主要内容',
  complementary: '与主要内容互补的内容（如侧边栏）',
  contentinfo: '页脚信息，如版权、隐私政策',
  search: '搜索功能区域',

  //  widget
  button: '可点击的按钮',
  link: '链接',
  dialog: '对话框或模态框',
  alert: '重要的信息提示，不需要用户响应',
  alertdialog: '需要用户响应的警告对话框',
  progressbar: '进度指示器',
  status: '状态信息',

  //  live regions
  log: '日志输出区域',
  marquee: '滚动内容',
  timer: '计时器',
} as const

/**
 * 焦点可见性检测
 * 只在键盘导航时显示焦点环
 */
export function setupFocusVisible(): void {
  // 检测是否是键盘导航
  document.body.addEventListener('mousedown', () => {
    document.body.classList.add('using-mouse')
    document.body.classList.remove('using-keyboard')
  })

  document.body.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      document.body.classList.add('using-keyboard')
      document.body.classList.remove('using-mouse')
    }
  })
}
