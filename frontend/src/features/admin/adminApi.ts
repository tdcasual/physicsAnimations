import { clearToken, getToken } from '../auth/authApi'
import { apiFetchJson } from '../shared/httpClient'
import { parseAdminItemsResponse, toApiError } from './adminContracts'
import type { AdminItemsResponse } from './adminTypes'

export type { AdminApiError, AdminItemRow, AdminItemsResponse } from './adminTypes'

async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetchJson<T>({
    path,
    options,
    token: getToken(),
    onUnauthorized: () => {
      clearToken()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pa-auth-expired'))
      }
    },
    toError: (status, data) => toApiError(status, data),
  })
}

export interface AdminListParams {
  page?: number
  pageSize?: number
  q?: string
  type?: string
}

export async function listAdminItems(params: AdminListParams = {}): Promise<AdminItemsResponse> {
  const query = new URLSearchParams()
  query.set('page', String(params.page || 1))
  query.set('pageSize', String(params.pageSize || 24))
  if (params.q) query.set('q', params.q)
  if (params.type) query.set('type', params.type)

  const raw = await apiFetch(`/api/items?${query.toString()}`, { method: 'GET' })
  return parseAdminItemsResponse(raw)
}

export async function listTaxonomy(): Promise<any> {
  return apiFetch('/api/categories', { method: 'GET' })
}

export async function createLinkItem(payload: {
  url: string
  categoryId: string
  title: string
  description: string
}): Promise<any> {
  return apiFetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'link',
      ...payload,
    }),
  })
}

export async function uploadHtmlItem(payload: {
  file: File
  categoryId: string
  title: string
  description: string
  allowRiskyHtml?: boolean
}): Promise<any> {
  const formData = new FormData()
  formData.append('file', payload.file)
  formData.append('categoryId', payload.categoryId || 'other')
  formData.append('title', payload.title || '')
  formData.append('description', payload.description || '')
  if (payload.allowRiskyHtml === true) {
    formData.append('allowRiskyHtml', 'true')
  }

  return apiFetch('/api/items', {
    method: 'POST',
    body: formData,
  })
}

export async function updateAdminItem(id: string, patch: Record<string, unknown>): Promise<any> {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch || {}),
  })
}

export async function deleteAdminItem(id: string): Promise<any> {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function createGroup(payload: {
  id: string
  title: string
  order?: number
  hidden?: boolean
}): Promise<any> {
  return apiFetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: payload.id,
      title: payload.title,
      order: payload.order ?? 0,
      hidden: payload.hidden === true,
    }),
  })
}

export async function updateGroup(id: string, patch: Record<string, unknown>): Promise<any> {
  return apiFetch(`/api/groups/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch || {}),
  })
}

export async function deleteGroup(id: string): Promise<any> {
  return apiFetch(`/api/groups/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function createCategory(payload: {
  id: string
  groupId: string
  title: string
  order?: number
  hidden?: boolean
}): Promise<any> {
  return apiFetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: payload.id,
      groupId: payload.groupId,
      title: payload.title,
      order: payload.order ?? 0,
      hidden: payload.hidden === true,
    }),
  })
}

export async function updateCategory(id: string, patch: Record<string, unknown>): Promise<any> {
  return apiFetch(`/api/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch || {}),
  })
}

export async function deleteCategory(id: string): Promise<any> {
  return apiFetch(`/api/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function getSystemInfo(): Promise<any> {
  return apiFetch('/api/system', { method: 'GET' })
}

export async function updateSystemEmbedUpdater(payload: {
  enabled?: boolean
  intervalDays?: number
}): Promise<any> {
  return apiFetch('/api/system/embed-updater', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: payload.enabled,
      intervalDays: payload.intervalDays,
    }),
  })
}

export async function updateSystemStorage(payload: {
  mode?: string
  webdav?: Record<string, unknown>
  sync?: boolean
}): Promise<any> {
  return apiFetch('/api/system/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: payload.mode,
      webdav: payload.webdav || {},
      sync: payload.sync === true,
    }),
  })
}

export async function validateSystemStorage(payload: {
  webdav?: Record<string, unknown>
}): Promise<any> {
  return apiFetch('/api/system/storage/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      webdav: payload.webdav || {},
    }),
  })
}

export async function updateAccount(payload: {
  currentPassword: string
  newUsername?: string
  newPassword?: string
}): Promise<any> {
  return apiFetch('/api/auth/account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      newUsername: payload.newUsername,
      newPassword: payload.newPassword,
    }),
  })
}

export interface DashboardStats {
  dynamicTotal: number
  uploadTotal: number
  linkTotal: number
  categoryTotal: number
  total: number
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [uploads, links, taxonomy] = await Promise.all([
    listAdminItems({ page: 1, pageSize: 1, type: 'upload' }),
    listAdminItems({ page: 1, pageSize: 1, type: 'link' }),
    listTaxonomy(),
  ])

  const categories = Array.isArray(taxonomy?.categories) ? taxonomy.categories : []

  const uploadTotal = Number(uploads?.total || 0)
  const linkTotal = Number(links?.total || 0)
  const dynamicTotal = uploadTotal + linkTotal
  const categoryTotal = categories.length

  return {
    dynamicTotal,
    uploadTotal,
    linkTotal,
    categoryTotal,
    total: dynamicTotal,
  }
}

// 别名导出用于向后兼容 stores/admin/*
export { listAdminItems as listItems }
export { updateAdminItem as updateItem }
export { deleteAdminItem as deleteItem }
