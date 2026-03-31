import { defineStore } from 'pinia'
import { clearToken, getToken, login, me } from '@/features/auth/authApi'

export interface LoginInput {
  username: string
  password: string
}

interface AuthState {
  loggedIn: boolean
  username: string
  loading: boolean
}

/**
 * 认证状态管理 Store
 *
 * 管理用户登录状态、用户信息、加载状态
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    loggedIn: false,
    username: '',
    loading: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => state.loggedIn,
    isLoading: (state): boolean => state.loading,
  },

  actions: {
    /**
     * 初始化认证状态
     * 检查本地 token 并验证用户身份
     */
    async bootstrap() {
      const token = getToken()
      if (!token) {
        this.loggedIn = false
        this.username = ''
        return
      }

      try {
        const data = await me()
        this.loggedIn = true
        this.username = typeof data?.username === 'string' ? data.username : ''
      } catch {
        clearToken()
        this.loggedIn = false
        this.username = ''
      }
    },

    /**
     * 使用用户名密码登录
     */
    async loginWithPassword(input: LoginInput) {
      this.loading = true
      try {
        const data = await login(input)
        const account = await me().catch(() => null)
        this.loggedIn = true
        this.username =
          typeof account?.username === 'string'
            ? account.username
            : typeof data?.username === 'string'
              ? data.username
              : ''
      } catch (err) {
        this.loggedIn = false
        this.username = ''
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * 登出
     */
    logout() {
      clearToken()
      this.loggedIn = false
      this.username = ''
    },
  },
})
