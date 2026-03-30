import { describe, it, expect, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useFieldErrors } from '../../../src/features/admin/composables/useFieldErrors'

describe('useFieldErrors', () => {
  describe('内部状态管理', () => {
    it('应以空错误对象初始化', () => {
      const { fieldErrors } = useFieldErrors()
      expect(fieldErrors.value).toEqual({})
    })

    it('应能设置单个字段错误', () => {
      const { fieldErrors, setFieldError } = useFieldErrors()

      setFieldError('username', '用户名不能为空')

      expect(fieldErrors.value).toEqual({ username: '用户名不能为空' })
    })

    it('应能设置多个字段错误', () => {
      const { fieldErrors, setFieldError } = useFieldErrors()

      setFieldError('username', '用户名不能为空')
      setFieldError('password', '密码太短')

      expect(fieldErrors.value).toEqual({
        username: '用户名不能为空',
        password: '密码太短',
      })
    })

    it('设置错误时应保留其他字段错误', () => {
      const { fieldErrors, setFieldError } = useFieldErrors()

      setFieldError('username', '用户名错误')
      setFieldError('email', '邮箱格式错误')

      expect(fieldErrors.value.username).toBe('用户名错误')
      expect(fieldErrors.value.email).toBe('邮箱格式错误')
    })

    it('应能获取字段错误', () => {
      const { setFieldError, getFieldError } = useFieldErrors()

      setFieldError('username', '用户名错误')

      expect(getFieldError('username')).toBe('用户名错误')
      expect(getFieldError('password')).toBe('')
    })

    it('应能清除单个字段错误', () => {
      const { fieldErrors, setFieldError, clearFieldErrors } = useFieldErrors()

      setFieldError('username', '用户名错误')
      setFieldError('password', '密码错误')
      clearFieldErrors('username')

      expect(fieldErrors.value.username).toBeUndefined()
      expect(fieldErrors.value.password).toBe('密码错误')
    })

    it('应能清除所有字段错误', () => {
      const { fieldErrors, setFieldError, clearFieldErrors } = useFieldErrors()

      setFieldError('username', '用户名错误')
      setFieldError('password', '密码错误')
      clearFieldErrors()

      expect(fieldErrors.value).toEqual({})
    })

    it('清除不存在的字段不应报错', () => {
      const { clearFieldErrors } = useFieldErrors()

      expect(() => clearFieldErrors('nonexistent')).not.toThrow()
    })
  })

  describe('外部状态集成', () => {
    it('应能使用外部ref', () => {
      const externalErrors = ref<Record<string, string>>({})
      const { setFieldError, getFieldError } = useFieldErrors(externalErrors)

      setFieldError('field', '错误信息')

      expect(externalErrors.value.field).toBe('错误信息')
      expect(getFieldError('field')).toBe('错误信息')
    })

    it('外部ref变化应同步到composable', async () => {
      const externalErrors = ref<Record<string, string>>({})
      const { getFieldError } = useFieldErrors(externalErrors)

      externalErrors.value = { test: '外部错误' }
      await nextTick()

      expect(getFieldError('test')).toBe('外部错误')
    })
  })

  describe('边界情况', () => {
    it('空字符串错误应被视为有效错误', () => {
      const { fieldErrors, setFieldError } = useFieldErrors()

      setFieldError('field', '')

      expect(fieldErrors.value.field).toBe('')
    })

    it('特殊字符错误信息应被正确处理', () => {
      const { fieldErrors, setFieldError, getFieldError } = useFieldErrors()
      const specialMessage = '错误: <script>alert("xss")</script>'

      setFieldError('field', specialMessage)

      expect(getFieldError('field')).toBe(specialMessage)
    })

    it('长错误信息应被正确处理', () => {
      const { fieldErrors, setFieldError, getFieldError } = useFieldErrors()
      const longMessage = '错误'.repeat(1000)

      setFieldError('field', longMessage)

      expect(getFieldError('field')).toBe(longMessage)
    })

    it('应正确处理多次设置同一字段', () => {
      const { fieldErrors, setFieldError } = useFieldErrors()

      setFieldError('field', '错误1')
      setFieldError('field', '错误2')
      setFieldError('field', '错误3')

      expect(fieldErrors.value.field).toBe('错误3')
    })
  })
})
