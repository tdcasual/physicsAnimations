import { ref, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { resolveAdminRedirect } from '@/router/redirect'

export function useLoginModal() {
  const router = useRouter()
  const route = useRoute()
  const auth = useAuthStore()

  const loginOpen = ref(false)
  const loginUsername = ref('')
  const loginPassword = ref('')
  const loginError = ref('')
  const loginUsernameInputRef = ref<HTMLInputElement | null>(null)
  const modalCardRef = ref<HTMLElement | null>(null)

  let lastFocusedBeforeLogin: HTMLElement | null = null
  let bodyOverflowBeforeLogin = ''

  function openLogin() {
    lastFocusedBeforeLogin = document.activeElement instanceof HTMLElement ? document.activeElement : null
    loginOpen.value = true
    loginError.value = ''
    nextTick(() => loginUsernameInputRef.value?.focus())
  }

  function closeLogin() {
    loginOpen.value = false
    loginError.value = ''
    loginUsername.value = ''
    loginPassword.value = ''
    const restoreTarget = lastFocusedBeforeLogin
    lastFocusedBeforeLogin = null
    restoreTarget?.focus()
  }

  function getModalFocusables(): HTMLElement[] {
    if (!modalCardRef.value) return []
    const focusable = modalCardRef.value.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])'
    )
    return Array.from(focusable).filter(node => {
      if (!(node instanceof HTMLElement)) return false
      return !node.hasAttribute('disabled') && node.tabIndex !== -1
    })
  }

  function handleLoginModalKeydown(event: KeyboardEvent) {
    if (!loginOpen.value) return
    if (event.key === 'Escape') { event.preventDefault(); closeLogin(); return }
    if (event.key !== 'Tab') return
    const focusables = getModalFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement as HTMLElement | null
    const inModal = active ? modalCardRef.value?.contains(active) === true : false

    if (event.shiftKey) {
      if (!inModal || active === first) { event.preventDefault(); last.focus() }
      return
    }
    if (!inModal || active === last) { event.preventDefault(); first.focus() }
  }

  function clearLoginError() { if (loginError.value) loginError.value = '' }

  function toLoginMessage(err: unknown): string {
    const e = err as { status?: number; data?: { retryAfterSeconds?: number } }
    const status = e?.status
    const retryAfterSeconds = e?.data?.retryAfterSeconds

    if (window.location.protocol === 'file:') return '请先运行 npm start，再通过 http://localhost:4173 访问。'
    if (status === 401) return '用户名或密码错误。'
    if (status === 429) return retryAfterSeconds ? `尝试过于频繁，请 ${retryAfterSeconds} 秒后再试。` : '尝试过于频繁，请稍后再试。'
    if (status === 404) return '未找到登录接口，请确认服务端已启动。'
    if (!status) return '无法连接服务端，请确认已运行 npm start。'
    return '登录失败，请稍后再试。'
  }

  async function submitLogin() {
    if (auth.isLoading) return
    loginError.value = ''
    try {
      await auth.loginWithPassword({ username: loginUsername.value, password: loginPassword.value })
      loginPassword.value = ''
      const redirect = resolveAdminRedirect(route.query.redirect)
      closeLogin()
      await router.replace(redirect)
    } catch (err) {
      loginError.value = toLoginMessage(err)
    }
  }

  watch(loginOpen, open => {
    if (open) {
      bodyOverflowBeforeLogin = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleLoginModalKeydown)
      nextTick(() => loginUsernameInputRef.value?.focus())
    } else {
      window.removeEventListener('keydown', handleLoginModalKeydown)
      document.body.style.overflow = bodyOverflowBeforeLogin
      bodyOverflowBeforeLogin = ''
    }
  })

  return {
    loginOpen, loginUsername, loginPassword, loginError,
    loginUsernameInputRef, modalCardRef,
    openLogin, closeLogin, clearLoginError, submitLogin,
    handleLoginModalKeydown,
  }
}
