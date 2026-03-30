/**
 * Pinia Stores 索引
 *
 * 统一导出所有 Store，便于管理和使用
 */

export { useAuthStore } from './auth'
export { useCatalogStore } from './catalog'
export { useContentAdminStore } from './admin/content'
export { useTaxonomyAdminStore } from './admin/taxonomy'

// Admin stores namespace
export * as AdminStores from './admin'
