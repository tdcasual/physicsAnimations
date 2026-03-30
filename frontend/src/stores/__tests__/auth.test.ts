import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'
import * as authApi from '@/features/auth/authApi'

// Mock authApi
vi.mock('@/features/auth/authApi', () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
  login: vi.fn(),
  me: vi.fn(),
}))

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useAuthStore()

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
      expect(store.loading).toBe(false)
      expect(store.isAuthenticated).toBe(false)
      expect(store.isLoading).toBe(false)
    })
  })

  describe('bootstrap', () => {
    it('should set loggedIn to false when no token', async () => {
      vi.mocked(authApi.getToken).mockReturnValue('')

      const store = useAuthStore()
      await store.bootstrap()

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
    })

    it('should set user info when token is valid', async () => {
      vi.mocked(authApi.getToken).mockReturnValue('valid-token')
      vi.mocked(authApi.me).mockResolvedValue({ username: 'testuser' })

      const store = useAuthStore()
      await store.bootstrap()

      expect(store.loggedIn).toBe(true)
      expect(store.username).toBe('testuser')
    })

    it('should handle me() failure', async () => {
      vi.mocked(authApi.getToken).mockReturnValue('invalid-token')
      vi.mocked(authApi.me).mockRejectedValue(new Error('Invalid token'))

      const store = useAuthStore()
      await store.bootstrap()

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
      expect(authApi.clearToken).toHaveBeenCalled()
    })

    it('should handle non-string username', async () => {
      vi.mocked(authApi.getToken).mockReturnValue('valid-token')
      vi.mocked(authApi.me).mockResolvedValue({ username: 123 } as any)

      const store = useAuthStore()
      await store.bootstrap()

      expect(store.loggedIn).toBe(true)
      expect(store.username).toBe('')
    })
  })

  describe('loginWithPassword', () => {
    it('should login successfully', async () => {
      vi.mocked(authApi.login).mockResolvedValue({ token: 'new-token' })
      vi.mocked(authApi.me).mockResolvedValue({ username: 'newuser' })

      const store = useAuthStore()
      await store.loginWithPassword({ username: 'admin', password: 'password' })

      expect(store.loggedIn).toBe(true)
      expect(store.username).toBe('newuser')
      expect(store.loading).toBe(false)
    })

    it('should use login response username when me fails', async () => {
      vi.mocked(authApi.login).mockResolvedValue({ username: 'fallbackuser' })
      vi.mocked(authApi.me).mockRejectedValue(new Error('Network error'))

      const store = useAuthStore()
      await store.loginWithPassword({ username: 'admin', password: 'password' })

      expect(store.loggedIn).toBe(true)
      expect(store.username).toBe('fallbackuser')
    })

    it('should handle login failure', async () => {
      vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'))

      const store = useAuthStore()
      await expect(
        store.loginWithPassword({ username: 'admin', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials')

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
      expect(store.loading).toBe(false)
    })

    it('should set loading during login', async () => {
      vi.mocked(authApi.login).mockResolvedValue({})
      vi.mocked(authApi.me).mockResolvedValue({})

      const store = useAuthStore()
      const loginPromise = store.loginWithPassword({ username: 'admin', password: 'password' })

      expect(store.loading).toBe(true)

      await loginPromise
      expect(store.loading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear auth state', () => {
      const store = useAuthStore()
      store.loggedIn = true
      store.username = 'testuser'

      store.logout()

      expect(store.loggedIn).toBe(false)
      expect(store.username).toBe('')
      expect(authApi.clearToken).toHaveBeenCalled()
    })
  })
})
