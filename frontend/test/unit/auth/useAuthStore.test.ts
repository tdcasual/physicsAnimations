import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../../src/features/auth/useAuthStore'
import * as authApi from '../../../src/features/auth/authApi'

// Mock authApi 模块
vi.mock('../../../src/features/auth/authApi', () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  login: vi.fn(),
  me: vi.fn(),
}))

describe('useAuthStore', () => {
  const mockedGetToken = authApi.getToken as MockedFunction<typeof authApi.getToken>
  const mockedMe = authApi.me as MockedFunction<typeof authApi.me>
  const mockedLogin = authApi.login as MockedFunction<typeof authApi.login>
  const mockedClearToken = authApi.clearToken as MockedFunction<typeof authApi.clearToken>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应以未登录状态初始化', () => {
      const store = useAuthStore()

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
      expect(store.loading).toBe(false)
    })
  })

  describe('bootstrap', () => {
    it('当没有token时应保持未登录状态', async () => {
      mockedGetToken.mockReturnValue('')

      const store = useAuthStore()
      await store.bootstrap()

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
      expect(mockedMe).not.toHaveBeenCalled()
    })

    it('当有有效token时应设置登录状态', async () => {
      mockedGetToken.mockReturnValue('valid-token')
      mockedMe.mockResolvedValue({ username: 'admin', id: '1' })

      const store = useAuthStore()
      await store.bootstrap()

      expect(store.loggedIn).toBe(true)
      expect(store.username).toBe('admin')
      expect(mockedMe).toHaveBeenCalled()
    })

    it('当token无效时应清除状态', async () => {
      mockedGetToken.mockReturnValue('invalid-token')
      mockedMe.mockRejectedValue(new Error('Unauthorized'))

      const store = useAuthStore()
      await store.bootstrap()

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
      expect(mockedClearToken).toHaveBeenCalled()
    })

    it('应处理me返回的非标准响应', async () => {
      mockedGetToken.mockReturnValue('valid-token')
      mockedMe.mockResolvedValue({ username: 123, id: '1' } as any)

      const store = useAuthStore()
      await store.bootstrap()

      expect(store.loggedIn).toBe(true)
      expect(store.username).toBe('') // 非字符串username应被忽略
    })
  })

  describe('loginWithPassword', () => {
    it('登录成功时应设置认证状态', async () => {
      mockedLogin.mockResolvedValue({ token: 'new-token', username: 'admin' })
      mockedMe.mockResolvedValue({ username: 'admin', id: '1' })

      const store = useAuthStore()

      await store.loginWithPassword({ username: 'admin', password: 'password' })

      expect(store.loggedIn).toBe(true)
      expect(store.username).toBe('admin')
      expect(store.loading).toBe(false)
    })

    it('登录失败时应清除状态并抛出错误', async () => {
      mockedLogin.mockRejectedValue(new Error('Invalid credentials'))

      const store = useAuthStore()

      await expect(
        store.loginWithPassword({ username: 'wrong', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials')

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
      expect(store.loading).toBe(false)
    })

    it('应正确设置loading状态', async () => {
      mockedLogin.mockResolvedValue({ token: 'token' })
      mockedMe.mockResolvedValue({ username: 'admin' })

      const store = useAuthStore()

      const loginPromise = store.loginWithPassword({
        username: 'admin',
        password: 'password',
      })

      expect(store.loading).toBe(true)

      await loginPromise

      expect(store.loading).toBe(false)
    })

    it('应从login响应中获取username', async () => {
      mockedLogin.mockResolvedValue({ token: 'token', username: 'testuser' })
      mockedMe.mockRejectedValue(new Error('Network error'))

      const store = useAuthStore()

      await store.loginWithPassword({ username: 'test', password: 'pass' })

      // 如果me失败，应使用login响应中的username
      expect(store.loggedIn).toBe(true)
      expect(store.username).toBe('testuser')
    })
  })

  describe('logout', () => {
    it('应清除所有认证状态', () => {
      const store = useAuthStore()

      // 先设置登录状态
      store.loggedIn = true
      store.username = 'admin'

      store.logout()

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
      expect(mockedClearToken).toHaveBeenCalled()
    })
  })
})
