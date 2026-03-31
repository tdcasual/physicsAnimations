/**
 * 应用常量
 * 统一管理魔法字符串和配置值
 */

// 默认分类/分组 ID
export const DEFAULT_GROUP_ID = 'physics'
export const DEFAULT_CATEGORY_ID = 'other'
export const ALL_CATEGORIES = 'all'

// localStorage 键名
export const STORAGE_KEYS = {
  LOCALE: 'app-locale',
  VIEW_STATE: 'pa_view_state',
  FAVORITE_DEMOS: 'pa_favorite_demos',
  RECENT_ACTIVITY: 'pa_recent_activity',
} as const

// 排序字段
export const SORT_FIELDS = {
  LAST_VIEWED: 'lastViewedAt',
  FAVORITED: 'favoritedAt',
  ORDER: 'order',
  TITLE: 'title',
} as const

// API 错误码
export const API_ERROR_CODES = {
  INVALID_USERNAME: 'invalid_username',
  INVALID_PASSWORD: 'invalid_password',
  INVALID_TITLE: 'invalid_title',
} as const

// 文件类型
export const FILE_TYPES = {
  UPLOAD: 'upload',
  LINK: 'link',
} as const

// 状态码
export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const

// 最大 URL 长度（安全限制）
export const MAX_URL_LENGTH = 2048

// 默认分页大小
export const DEFAULT_PAGE_SIZE = 24
