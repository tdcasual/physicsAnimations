/**
 * 本地存储工具
 * 统一封装 localStorage 操作，添加异常处理和类型验证
 */

export type Validator<T> = (val: unknown) => val is T

export function getItem<T>(key: string, defaultValue: T, validator?: Validator<T>): T {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    const parsed = JSON.parse(item) as unknown
    if (validator && !validator(parsed)) return defaultValue
    return parsed as T
  } catch {
    return defaultValue
  }
}

export function getString(key: string, defaultValue = ''): string {
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

export function setItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function setString(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeItem(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

// 常用验证器
export const isStringArray = (val: unknown): val is string[] =>
  Array.isArray(val) && val.every(item => typeof item === 'string')

export const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val)
