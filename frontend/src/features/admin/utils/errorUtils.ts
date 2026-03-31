/**
 * Admin 模块错误处理工具
 * 统一处理 API 错误和认证错误
 */

/**
 * 解析 API 错误消息
 * 将 HTTP 状态码转换为友好的错误提示
 */
export function resolveAuthError(status: number | undefined, fallbackText = '操作失败。'): string {
  if (status === 401) {
    return '请先登录管理员账号。'
  }
  return fallbackText
}

/**
 * 检查错误是否为 API 错误对象
 */
export function isApiError(err: unknown): err is { status?: number; data?: { error?: string } } {
  return typeof err === 'object' && err !== null && ('status' in err || 'data' in err)
}

/**
 * 获取错误状态码
 */
export function getErrorStatus(err: unknown): number | undefined {
  if (isApiError(err)) {
    return err.status
  }
  return undefined
}

/**
 * 创建通用的保存错误处理器
 */
export function createSaveErrorHandler(options: {
  onAuthError?: () => void
  fallbackMessage?: string
}) {
  return (err: unknown): string => {
    const status = getErrorStatus(err)
    if (status === 401) {
      options.onAuthError?.()
      return '请先登录管理员账号。'
    }
    return options.fallbackMessage || '保存失败。'
  }
}
