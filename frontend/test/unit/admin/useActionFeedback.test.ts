import { describe, it, expect, beforeEach } from 'vitest'
import { useActionFeedback } from '../../../src/features/admin/composables/useActionFeedback'

describe('useActionFeedback', () => {
  beforeEach(() => {
    // 每个测试使用新的实例
  })

  describe('初始状态', () => {
    it('应以空文本和错误标志为false初始化', () => {
      const { actionFeedback, actionFeedbackError } = useActionFeedback()
      
      expect(actionFeedback.value).toBe('')
      expect(actionFeedbackError.value).toBe(false)
    })
  })

  describe('setActionFeedback', () => {
    it('应设置反馈文本', () => {
      const { actionFeedback, actionFeedbackError, setActionFeedback } = useActionFeedback()
      
      setActionFeedback('操作成功')
      
      expect(actionFeedback.value).toBe('操作成功')
      expect(actionFeedbackError.value).toBe(false)
    })

    it('应设置错误反馈', () => {
      const { actionFeedback, actionFeedbackError, setActionFeedback } = useActionFeedback()
      
      setActionFeedback('操作失败', true)
      
      expect(actionFeedback.value).toBe('操作失败')
      expect(actionFeedbackError.value).toBe(true)
    })

    it('应覆盖之前的反馈', () => {
      const { actionFeedback, setActionFeedback } = useActionFeedback()
      
      setActionFeedback('第一条消息')
      setActionFeedback('第二条消息')
      
      expect(actionFeedback.value).toBe('第二条消息')
    })

    it('默认情况下isError应为false', () => {
      const { actionFeedbackError, setActionFeedback } = useActionFeedback()
      
      setActionFeedback('普通消息')
      
      expect(actionFeedbackError.value).toBe(false)
    })
  })

  describe('clearActionFeedback', () => {
    it('应清除反馈文本', () => {
      const { actionFeedback, setActionFeedback, clearActionFeedback } = useActionFeedback()
      
      setActionFeedback('测试消息')
      clearActionFeedback()
      
      expect(actionFeedback.value).toBe('')
    })

    it('应重置错误标志', () => {
      const { actionFeedbackError, setActionFeedback, clearActionFeedback } = useActionFeedback()
      
      setActionFeedback('错误', true)
      clearActionFeedback()
      
      expect(actionFeedbackError.value).toBe(false)
    })

    it('清除空反馈不应报错', () => {
      const { clearActionFeedback } = useActionFeedback()
      
      expect(() => clearActionFeedback()).not.toThrow()
    })
  })

  describe('边界情况', () => {
    it('应处理空字符串', () => {
      const { actionFeedback, setActionFeedback } = useActionFeedback()
      
      setActionFeedback('')
      
      expect(actionFeedback.value).toBe('')
    })

    it('应处理长文本', () => {
      const { actionFeedback, setActionFeedback } = useActionFeedback()
      const longText = '这是一段很长的文本'.repeat(100)
      
      setActionFeedback(longText)
      
      expect(actionFeedback.value).toBe(longText)
    })

    it('应处理特殊字符', () => {
      const { actionFeedback, setActionFeedback } = useActionFeedback()
      const specialText = '<script>alert("xss")</script> 特殊字符: 🎉 中文'
      
      setActionFeedback(specialText)
      
      expect(actionFeedback.value).toBe(specialText)
    })

    it('多次设置和清除应正常工作', () => {
      const { actionFeedback, actionFeedbackError, setActionFeedback, clearActionFeedback } = 
        useActionFeedback()
      
      setActionFeedback('消息1', false)
      clearActionFeedback()
      setActionFeedback('消息2', true)
      clearActionFeedback()
      setActionFeedback('消息3', false)
      
      expect(actionFeedback.value).toBe('消息3')
      expect(actionFeedbackError.value).toBe(false)
    })

    it('从错误切换到成功应更新标志', () => {
      const { actionFeedbackError, setActionFeedback } = useActionFeedback()
      
      setActionFeedback('错误', true)
      expect(actionFeedbackError.value).toBe(true)
      
      setActionFeedback('成功', false)
      expect(actionFeedbackError.value).toBe(false)
    })
  })
})
