/**
 * Sentry 错误监控配置
 *
 * 用于生产环境错误追踪和性能监控
 */

import * as Sentry from '@sentry/vue'
import type { App } from 'vue'
import { router } from '../router'

// Sentry DSN - 实际使用时替换为真实的 DSN
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''

/**
 * 初始化 Sentry
 */
export function initSentry(app: App): void {
  // 只在生产环境或明确启用时初始化
  if (!SENTRY_DSN && import.meta.env.PROD) {
    console.warn('Sentry DSN not configured')
    return
  }

  if (!SENTRY_DSN) {
    return
  }

  Sentry.init({
    app,
    dsn: SENTRY_DSN,
    integrations: [
      // 浏览器性能追踪
      Sentry.browserTracingIntegration(),
      // 回放集成（可选，用于查看用户操作回放）
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // 性能采样率
    tracesSampleRate: 0.1,
    // 回放采样率
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 0.1,
    // 环境
    environment: import.meta.env.MODE,
    // 发布版本
    release: import.meta.env.VITE_APP_VERSION || 'dev',
    // 忽略的错误
    ignoreErrors: [
      // 网络错误
      'Network Error',
      'Failed to fetch',
      'AbortError',
      // 浏览器扩展错误
      'chrome-extension',
      'moz-extension',
      // 第三方脚本错误
      'Script error.',
    ],
    // 过滤 URL
    denyUrls: [
      // 浏览器扩展
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
    // 在发送到 Sentry 前修改事件
    beforeSend(event) {
      // 可以在这里过滤敏感信息
      return event
    },
  })

  // 配置路由追踪
  router.afterEach(to => {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${to.fullPath}`,
      level: 'info',
    })
  })
}

/**
 * 设置用户上下文
 */
export function setSentryUser(userId: string, email?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    username,
  })
}

/**
 * 清除用户上下文
 */
export function clearSentryUser(): void {
  Sentry.setUser(null)
}

/**
 * 添加面包屑
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
  })
}

/**
 * 手动捕获异常
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.withScope(scope => {
      scope.setExtras(context)
      Sentry.captureException(error)
    })
  } else {
    Sentry.captureException(error)
  }
}

/**
 * 手动捕获消息
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  Sentry.captureMessage(message, level)
}

export default Sentry
