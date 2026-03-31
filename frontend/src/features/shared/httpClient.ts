function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const out: Record<string, string> = {}
    headers.forEach((value, key) => {
      out[key] = value
    })
    return out
  }
  if (Array.isArray(headers)) {
    const out: Record<string, string> = {}
    for (const [key, value] of headers) {
      out[key] = value
    }
    return out
  }
  return { ...(headers as Record<string, string>) }
}

function buildHeaders(headers?: HeadersInit, token = ''): Record<string, string> {
  const merged = {
    Accept: 'application/json',
    ...toHeaderRecord(headers),
  }
  if (!token) return merged
  return {
    ...merged,
    Authorization: `Bearer ${token}`,
  }
}

export async function apiFetchJson<T = any>(params: {
  path: string
  options?: RequestInit
  token?: string
  onUnauthorized?: () => void
  toError?: (status: number, data: any) => Error
  timeoutMs?: number
}): Promise<T> {
  const { path, options = {}, token = '', onUnauthorized, toError, timeoutMs = 30000 } = params

  // 创建 AbortController 用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(path, {
      ...options,
      headers: buildHeaders(options.headers, token),
      signal: controller.signal,
    })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (response.status === 401) {
    onUnauthorized?.()
  }

    if (response.ok) return data as T

    if (typeof toError === 'function') {
      throw toError(response.status, data)
    }

    const fallback = new Error(
      typeof data?.error === 'string' ? data.error : 'request_failed'
    ) as Error & {
      status?: number
      data?: any
    }
    fallback.status = response.status
    fallback.data = data
    throw fallback
  } catch (err) {
    // 如果是超时导致的 AbortError，转换为更友好的错误
    if (err instanceof Error && err.name === 'AbortError') {
      const timeoutError = new Error('request_timeout') as Error & { status?: number }
      timeoutError.status = 0
      throw timeoutError
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
