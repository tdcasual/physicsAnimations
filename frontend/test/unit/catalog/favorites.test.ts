import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseFavoriteDemos,
  serializeFavoriteDemos,
  readFavoriteDemos,
  writeFavoriteDemos,
  isFavoriteDemo,
  toggleFavoriteDemo,
  type FavoriteDemoEntry,
} from '../../../src/features/catalog/favorites'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('favorites', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('parseFavoriteDemos', () => {
    it('应正确解析有效JSON', () => {
      const data: FavoriteDemoEntry[] = [
        { id: 'demo1', favoritedAt: 1234567890 },
        { id: 'demo2', favoritedAt: 1234567891 },
      ]
      
      const result = parseFavoriteDemos(JSON.stringify(data))
      
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('demo1')
      expect(result[0].favoritedAt).toBe(1234567890)
    })

    it('空字符串应返回空数组', () => {
      expect(parseFavoriteDemos('')).toEqual([])
      expect(parseFavoriteDemos(null as any)).toEqual([])
      expect(parseFavoriteDemos(undefined as any)).toEqual([])
    })

    it('无效JSON应返回空数组', () => {
      expect(parseFavoriteDemos('invalid json')).toEqual([])
      expect(parseFavoriteDemos('{broken}')).toEqual([])
    })

    it('非数组应返回空数组', () => {
      expect(parseFavoriteDemos('{"id": "1"}')).toEqual([])
      expect(parseFavoriteDemos('123')).toEqual([])
    })

    it('应过滤无效条目', () => {
      const data = [
        { id: 'valid', favoritedAt: 1234567890 },
        { id: '', favoritedAt: 1234567890 }, // 无效：空id
        { id: 'valid2', favoritedAt: -1 }, // 无效：负数时间
        { id: 'valid3', favoritedAt: 0 }, // 无效：0时间
        null, // 无效：null
        { id: 'valid4', favoritedAt: 9999999999 }, // 有效
        { id: 'valid5' }, // 无效：缺少favoritedAt
      ]
      
      const result = parseFavoriteDemos(JSON.stringify(data))
      
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('valid')
      expect(result[1].id).toBe('valid4')
    })
  })

  describe('serializeFavoriteDemos', () => {
    it('应正确序列化为JSON', () => {
      const data: FavoriteDemoEntry[] = [
        { id: 'demo1', favoritedAt: 1234567890 },
      ]
      
      const result = serializeFavoriteDemos(data)
      
      expect(JSON.parse(result)).toEqual(data)
    })

    it('应处理空数组', () => {
      expect(serializeFavoriteDemos([])).toBe('[]')
    })

    it('应清理数据（去除空白，确保数字）', () => {
      const data = [
        { id: ' demo1 ', favoritedAt: '1234567890' as any },
      ]
      
      const result = JSON.parse(serializeFavoriteDemos(data))
      
      expect(result[0].id).toBe('demo1') // 去除空白
      expect(result[0].favoritedAt).toBe(1234567890) // 转为数字
    })
  })

  describe('readFavoriteDemos', () => {
    it('应从localStorage读取', () => {
      const data: FavoriteDemoEntry[] = [{ id: 'demo1', favoritedAt: 1234567890 }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(data))
      
      const result = readFavoriteDemos()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('pa_favorite_demos_v1')
      expect(result).toHaveLength(1)
    })

    it('localStorage错误应返回空数组', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const result = readFavoriteDemos()
      
      expect(result).toEqual([])
    })
  })

  describe('writeFavoriteDemos', () => {
    it('应写入localStorage', () => {
      const data: FavoriteDemoEntry[] = [{ id: 'demo1', favoritedAt: 1234567890 }]
      
      writeFavoriteDemos(data)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pa_favorite_demos_v1',
        JSON.stringify(data)
      )
    })

    it('localStorage错误应静默处理', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      expect(() => writeFavoriteDemos([{ id: 'demo1', favoritedAt: 1234567890 }])).not.toThrow()
    })
  })

  describe('isFavoriteDemo', () => {
    it('应返回true当项目在收藏中', () => {
      const data: FavoriteDemoEntry[] = [{ id: 'demo1', favoritedAt: 1234567890 }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(data))
      
      expect(isFavoriteDemo('demo1')).toBe(true)
    })

    it('应返回false当项目不在收藏中', () => {
      const data: FavoriteDemoEntry[] = [{ id: 'demo1', favoritedAt: 1234567890 }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(data))
      
      expect(isFavoriteDemo('demo2')).toBe(false)
    })

    it('空id应返回false', () => {
      expect(isFavoriteDemo('')).toBe(false)
      expect(isFavoriteDemo('   ')).toBe(false)
    })
  })

  describe('toggleFavoriteDemo', () => {
    it('应添加未收藏的项', () => {
      localStorageMock.getItem.mockReturnValue('[]')
      
      const result = toggleFavoriteDemo('demo1')
      
      expect(result.isFavorite).toBe(true)
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('demo1')
    })

    it('应移除已收藏的项', () => {
      const data: FavoriteDemoEntry[] = [{ id: 'demo1', favoritedAt: 1234567890 }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(data))
      
      const result = toggleFavoriteDemo('demo1')
      
      expect(result.isFavorite).toBe(false)
      expect(result.entries).toHaveLength(0)
    })

    it('新收藏的项应放在最前面', () => {
      const data: FavoriteDemoEntry[] = [
        { id: 'demo1', favoritedAt: 1000 },
        { id: 'demo2', favoritedAt: 2000 },
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(data))
      
      const result = toggleFavoriteDemo('demo3', { now: 3000 })
      
      expect(result.entries[0].id).toBe('demo3')
    })

    it('空id应返回原列表', () => {
      const data: FavoriteDemoEntry[] = [{ id: 'demo1', favoritedAt: 1000 }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(data))
      
      const result = toggleFavoriteDemo('')
      
      expect(result.isFavorite).toBe(false)
      expect(result.entries).toEqual(data)
    })

    it('应遵守最大限制', () => {
      const data: FavoriteDemoEntry[] = Array.from({ length: 25 }, (_, i) => ({
        id: `demo${i}`,
        favoritedAt: i * 1000,
      }))
      localStorageMock.getItem.mockReturnValue(JSON.stringify(data))
      
      const result = toggleFavoriteDemo('new-demo')
      
      expect(result.entries).toHaveLength(24) // 默认限制24
      expect(result.entries[0].id).toBe('new-demo')
      expect(result.entries.some(e => e.id === 'demo24')).toBe(false) // 最旧的被移除
    })

    it('应接受自定义限制', () => {
      const data: FavoriteDemoEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `demo${i}`,
        favoritedAt: i * 1000,
      }))
      localStorageMock.getItem.mockReturnValue(JSON.stringify(data))
      
      const result = toggleFavoriteDemo('new-demo', { limit: 5 })
      
      expect(result.entries).toHaveLength(5)
    })
  })
})
