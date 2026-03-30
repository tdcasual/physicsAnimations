import { describe, it, expect, beforeEach } from 'vitest'
import { usePagedAdminList } from '../../../src/features/admin/composables/usePagedAdminList'

interface TestItem {
  id: string
  name: string
}

describe('usePagedAdminList', () => {
  describe('初始状态', () => {
    it('应以正确的默认值初始化', () => {
      const { items, total, page, pageSize, hasMore } = usePagedAdminList<TestItem>()

      expect(items.value).toEqual([])
      expect(total.value).toBe(0)
      expect(page.value).toBe(1)
      expect(pageSize).toBe(24) // 默认值
      expect(hasMore.value).toBe(false)
    })

    it('应接受自定义pageSize', () => {
      const { pageSize } = usePagedAdminList<TestItem>({ pageSize: 50 })

      expect(pageSize).toBe(50)
    })
  })

  describe('applyPageResult', () => {
    it('应正确应用分页结果（重置模式）', () => {
      const { items, total, page, hasMore, applyPageResult } = usePagedAdminList<TestItem>()

      applyPageResult(
        {
          items: [{ id: '1', name: 'Item 1' }],
          page: 1,
          total: 100,
        },
        { reset: true }
      )

      expect(items.value).toHaveLength(1)
      expect(total.value).toBe(100)
      expect(page.value).toBe(1)
      expect(hasMore.value).toBe(true) // 1 < 100，还有更多
    })

    it('应正确应用分页结果（追加模式）', () => {
      const { items, page, applyPageResult } = usePagedAdminList<TestItem>()

      // 第一页
      applyPageResult({ items: [{ id: '1', name: 'Item 1' }], page: 1, total: 3 }, { reset: true })

      // 第二页（追加）
      applyPageResult({ items: [{ id: '2', name: 'Item 2' }], page: 2, total: 3 }, { reset: false })

      expect(items.value).toHaveLength(2)
      expect(items.value[0].id).toBe('1')
      expect(items.value[1].id).toBe('2')
      expect(page.value).toBe(2)
    })

    it('当加载完所有数据时应正确设置hasMore', () => {
      const { items, hasMore, applyPageResult } = usePagedAdminList<TestItem>({ pageSize: 10 })

      applyPageResult(
        {
          items: [
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' },
          ],
          page: 1,
          total: 2,
        },
        { reset: true }
      )

      expect(items.value).toHaveLength(2)
      expect(hasMore.value).toBe(false) // 已加载完
    })

    it('应处理空结果', () => {
      const { items, total, hasMore, applyPageResult } = usePagedAdminList<TestItem>()

      applyPageResult({ items: [], page: 1, total: 0 }, { reset: true })

      expect(items.value).toEqual([])
      expect(total.value).toBe(0)
      expect(hasMore.value).toBe(false)
    })

    it('应处理undefined结果', () => {
      const { items, total, page, applyPageResult } = usePagedAdminList<TestItem>()

      applyPageResult(undefined, { reset: true })

      expect(items.value).toEqual([])
      expect(total.value).toBe(0)
      expect(page.value).toBe(1)
    })

    it('应处理缺少items的结果', () => {
      const { items, total, applyPageResult } = usePagedAdminList<TestItem>()

      applyPageResult({ page: 1, total: 100 } as any, { reset: true })

      expect(items.value).toEqual([])
      expect(total.value).toBe(100)
    })
  })

  describe('request sequence', () => {
    it('应正确生成请求序列号', () => {
      const { nextRequestSeq, isLatestRequest } = usePagedAdminList<TestItem>()

      const seq1 = nextRequestSeq()
      const seq2 = nextRequestSeq()
      const seq3 = nextRequestSeq()

      expect(seq1).toBe(1)
      expect(seq2).toBe(2)
      expect(seq3).toBe(3)

      expect(isLatestRequest(seq3)).toBe(true)
      expect(isLatestRequest(seq2)).toBe(false)
      expect(isLatestRequest(seq1)).toBe(false)
    })

    it('应能识别最新请求', () => {
      const { nextRequestSeq, isLatestRequest } = usePagedAdminList<TestItem>()

      nextRequestSeq() // 1
      nextRequestSeq() // 2
      const latest = nextRequestSeq() // 3

      expect(isLatestRequest(latest)).toBe(true)
      expect(isLatestRequest(999)).toBe(false)
    })
  })

  describe('resetList', () => {
    it('应重置所有状态', () => {
      const { items, total, page, hasMore, applyPageResult, resetList } =
        usePagedAdminList<TestItem>()

      // 先加载一些数据
      applyPageResult({ items: [{ id: '1', name: 'Item' }], page: 3, total: 100 }, { reset: false })

      expect(items.value).toHaveLength(1)
      expect(page.value).toBe(3)

      // 重置
      resetList()

      expect(items.value).toEqual([])
      expect(total.value).toBe(0)
      expect(page.value).toBe(1)
      expect(hasMore.value).toBe(false)
    })
  })

  describe('边界情况', () => {
    it('应正确处理pageSize为0的情况', () => {
      const { pageSize } = usePagedAdminList<TestItem>({ pageSize: 0 })
      expect(pageSize).toBe(0)
    })

    it('应正确处理负数pageSize', () => {
      const { pageSize } = usePagedAdminList<TestItem>({ pageSize: -10 })
      expect(pageSize).toBe(-10)
    })

    it('应处理字符串类型的数字字段', () => {
      const { total, page, applyPageResult } = usePagedAdminList<TestItem>()

      applyPageResult({ items: [], page: '5' as any, total: '100' as any }, { reset: true })

      expect(page.value).toBe(5)
      expect(total.value).toBe(100)
    })

    it('多次追加应保持数据顺序', () => {
      const { items, applyPageResult } = usePagedAdminList<TestItem>()

      for (let i = 1; i <= 3; i++) {
        applyPageResult(
          { items: [{ id: String(i), name: `Item ${i}` }], page: i, total: 3 },
          { reset: i === 1 }
        )
      }

      expect(items.value).toHaveLength(3)
      expect(items.value.map(item => item.id)).toEqual(['1', '2', '3'])
    })
  })
})
