<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { RouterLink, useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from './features/auth/useAuthStore'
  import {
    initTheme,
    toggleTheme,
    toggleClassroomMode,
    type Theme,
    type ClassroomMode,
  } from './features/theme/theme'
  import { resolveTopbarModeClass, resolveTopbarSearchState } from './features/app/appShellTopbar'
  import { resolveAdminRedirect } from './router/redirect'
  import { useCatalogSearch } from './features/catalog/catalogSearch'
  import OfflineIndicator from './components/OfflineIndicator.vue'
  import PwaInstallPrompt from './components/PwaInstallPrompt.vue'

  const router = useRouter()
  const route = useRoute()
  const auth = useAuthStore()

  // 主题状态
  const theme = ref<Theme>('system')
  const classroom = ref<ClassroomMode>('off')

  // 登录弹窗
  const loginOpen = ref(false)
  const loginUsername = ref('')
  const loginPassword = ref('')
  const loginError = ref('')
  const loginLoading = ref(false)

  // 顶部栏
  const topbarRef = ref<HTMLElement | null>(null)
  const topbarUtilityOpen = ref(false)
  const loginUsernameInputRef = ref<HTMLInputElement | null>(null)
  const modalCardRef = ref<HTMLElement | null>(null)

  // 计算属性
  const currentPath = computed(() => String(route.path || ''))
  const isLoginRoute = computed(() => currentPath.value === '/login')
  const isCatalogRoute = computed(() => currentPath.value === '/')
  const isAdminShellRoute = computed(() => {
    return currentPath.value.startsWith('/admin') || currentPath.value === '/login'
  })
  const isAdminRoute = computed(() => currentPath.value.startsWith('/admin'))
  const isViewerRoute = computed(() => currentPath.value.startsWith('/viewer'))
  const isLibraryRoute = computed(() => currentPath.value.startsWith('/library'))
  const showAdminShortcut = computed(() => auth.loggedIn && !isAdminShellRoute.value)

  const classroomModeLabel = computed(() => `课堂模式${classroom.value === 'on' ? '开' : '关'}`)
  const topbarMoreSummary = computed(() => (auth.loggedIn ? '账号与后台' : '设置与登录'))

  const catalogQuery = useCatalogSearch()
  const topbarSearchState = computed(() => resolveTopbarSearchState(currentPath.value))
  const topbarModeClass = computed(() => resolveTopbarModeClass(currentPath.value))

  // 方法
  function onTopbarSearch(event: Event) {
    catalogQuery.value = (event.target as HTMLInputElement).value
  }

  let lastFocusedBeforeLogin: HTMLElement | null = null
  let bodyOverflowBeforeLogin = ''

  function openLogin() {
    topbarUtilityOpen.value = false
    lastFocusedBeforeLogin =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    loginOpen.value = true
    loginError.value = ''
    nextTick(() => {
      loginUsernameInputRef.value?.focus()
    })
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
    if (event.key === 'Escape') {
      event.preventDefault()
      closeLogin()
      return
    }
    if (event.key !== 'Tab') return
    const focusables = getModalFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement as HTMLElement | null
    const inModal = active ? modalCardRef.value?.contains(active) === true : false

    if (event.shiftKey) {
      if (!inModal || active === first) {
        event.preventDefault()
        last.focus()
      }
      return
    }
    if (!inModal || active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function clearLoginError() {
    if (!loginError.value) return
    loginError.value = ''
  }

  function toggleTopbarUtilityPanel() {
    topbarUtilityOpen.value = !topbarUtilityOpen.value
  }

  function toggleClassroom() {
    classroom.value = toggleClassroomMode(classroom.value)
    topbarUtilityOpen.value = false
  }

  function toggleThemeMode() {
    theme.value = toggleTheme(theme.value)
    topbarUtilityOpen.value = false
  }

  function toLoginMessage(err: unknown): string {
    const e = err as { status?: number; data?: { retryAfterSeconds?: number } }
    const status = e?.status
    const retryAfterSeconds = e?.data?.retryAfterSeconds

    if (window.location.protocol === 'file:') {
      return '请先运行 npm start，再通过 http://localhost:4173 访问。'
    }
    if (status === 401) return '用户名或密码错误。'
    if (status === 429) {
      return retryAfterSeconds
        ? `尝试过于频繁，请 ${retryAfterSeconds} 秒后再试。`
        : '尝试过于频繁，请稍后再试。'
    }
    if (status === 404) return '未找到登录接口，请确认服务端已启动。'
    if (!status) return '无法连接服务端，请确认已运行 npm start。'
    return '登录失败，请稍后再试。'
  }

  async function submitLogin() {
    loginError.value = ''
    try {
      await auth.loginWithPassword({
        username: loginUsername.value,
        password: loginPassword.value,
      })
      loginPassword.value = ''
      const redirect = resolveAdminRedirect(route.query.redirect)
      closeLogin()
      await router.replace(redirect)
    } catch (err) {
      loginError.value = toLoginMessage(err)
    }
  }

  async function logout() {
    topbarUtilityOpen.value = false
    auth.logout()
    if (String(route.path || '').startsWith('/admin')) {
      await router.replace('/')
    }
  }

  function handleAuthExpired() {
    topbarUtilityOpen.value = false
    auth.logout()
    const currentPath = String(route.fullPath || '')
    if (currentPath.startsWith('/admin')) {
      void router.replace({
        path: '/login',
        query: { redirect: currentPath },
      })
    }
  }

  function syncTopbarHeight() {
    const topbarHeight = Math.ceil(topbarRef.value?.getBoundingClientRect().height || 0)
    document.documentElement.style.setProperty('--app-topbar-height', `${topbarHeight}px`)
  }

  let topbarResizeObserver: ResizeObserver | null = null

  onMounted(async () => {
    const initial = initTheme()
    theme.value = initial.theme
    classroom.value = initial.classroom

    window.addEventListener('pa-auth-expired', handleAuthExpired as EventListener)
    await nextTick()
    syncTopbarHeight()
    if (typeof ResizeObserver !== 'undefined' && topbarRef.value) {
      topbarResizeObserver = new ResizeObserver(() => {
        syncTopbarHeight()
      })
      topbarResizeObserver.observe(topbarRef.value)
    }
    await auth.bootstrap()
    await nextTick()
    syncTopbarHeight()
  })

  watch(loginOpen, async open => {
    if (open) {
      bodyOverflowBeforeLogin = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleLoginModalKeydown)
      await nextTick()
      loginUsernameInputRef.value?.focus()
      return
    }
    window.removeEventListener('keydown', handleLoginModalKeydown)
    document.body.style.overflow = bodyOverflowBeforeLogin
    bodyOverflowBeforeLogin = ''
  })

  watch(
    () => route.fullPath,
    () => {
      topbarUtilityOpen.value = false
    }
  )

  onBeforeUnmount(() => {
    window.removeEventListener('pa-auth-expired', handleAuthExpired as EventListener)
    window.removeEventListener('keydown', handleLoginModalKeydown)
    topbarResizeObserver?.disconnect()
    topbarResizeObserver = null
    document.documentElement.style.removeProperty('--app-topbar-height')
    document.body.style.overflow = bodyOverflowBeforeLogin
  })
</script>

<template>
  <OfflineIndicator />
  <PwaInstallPrompt />
  <div class="app-shell">
    <header ref="topbarRef" :class="['topbar', topbarModeClass]">
      <div class="topbar-inner">
        <div class="topbar-shell-panel">
          <div class="topbar-lead">
            <RouterLink to="/" class="brand brand-link" aria-label="返回目录">
              <span class="brand-lockup">
                <span class="brand-mark">科学演示集</span>
              </span>
            </RouterLink>
            <RouterLink
              v-if="!isCatalogRoute"
              to="/"
              class="btn btn-ghost btn-nav-home topbar-home-link"
              aria-label="浏览首页"
            >
              <span class="topbar-home-label">首页</span>
            </RouterLink>
            <label v-if="topbarSearchState.kind === 'input'" class="topbar-search-field">
              <span class="sr-only">搜索</span>
              <input
                :value="catalogQuery"
                class="topbar-search"
                type="search"
                :placeholder="topbarSearchState.placeholder"
                autocomplete="off"
                @input="onTopbarSearch"
              />
            </label>
            <RouterLink
              v-else
              :to="topbarSearchState.target || '/'"
              class="topbar-search-launch"
              :aria-label="topbarSearchState.placeholder"
            >
              <span class="topbar-search-launch-kicker">查找演示</span>
              <span class="topbar-search-launch-label">{{ topbarSearchState.placeholder }}</span>
            </RouterLink>
          </div>
          <div class="topbar-actions">
            <!-- 电脑端：直接平铺所有按钮 -->
            <div class="topbar-inline-actions">
              <button
                type="button"
                class="btn btn-ghost"
                :aria-pressed="classroom === 'on'"
                @click="toggleClassroom"
              >
                {{ classroomModeLabel }}
              </button>
              <button type="button" class="btn btn-ghost" @click="toggleThemeMode">昼夜主题</button>
              <button
                v-if="!auth.loggedIn && !isLoginRoute"
                type="button"
                class="btn btn-primary"
                @click="openLogin"
              >
                登录
              </button>
              <template v-else-if="auth.loggedIn">
                <RouterLink
                  v-if="showAdminShortcut"
                  to="/admin/dashboard"
                  class="btn btn-primary topbar-admin-link"
                  >管理</RouterLink
                >
                <button type="button" class="btn btn-ghost topbar-logout-button" @click="logout"
                  >退出</button
                >
              </template>
            </div>
            <!-- 手机端：折叠到"更多"按钮 -->
            <button
              type="button"
              class="btn btn-ghost topbar-more-trigger"
              :class="{ 'is-open': topbarUtilityOpen }"
              :aria-expanded="topbarUtilityOpen ? 'true' : 'false'"
              aria-controls="topbar-more-panel"
              :aria-label="`更多：${topbarMoreSummary}`"
              @click="toggleTopbarUtilityPanel"
            >
              <span class="topbar-more-trigger-label">更多</span>
            </button>
            <div
              id="topbar-more-panel"
              class="topbar-more-panel"
              :class="{ 'is-open': topbarUtilityOpen }"
              :aria-hidden="topbarUtilityOpen ? 'false' : 'true'"
            >
              <div class="topbar-more-group">
                <p class="topbar-more-group-label">界面与课堂</p>
                <button
                  type="button"
                  class="btn btn-ghost"
                  :aria-pressed="classroom === 'on'"
                  @click="toggleClassroom"
                >
                  {{ classroomModeLabel }}
                </button>
                <button type="button" class="btn btn-ghost" @click="toggleThemeMode"
                  >昼夜主题</button
                >
              </div>
              <div class="topbar-more-group">
                <p class="topbar-more-group-label">{{
                  auth.loggedIn ? '账号与后台' : '登录与后台'
                }}</p>
                <button
                  v-if="!auth.loggedIn && !isLoginRoute"
                  type="button"
                  class="btn btn-primary"
                  @click="openLogin"
                >
                  登录
                </button>
                <template v-else-if="auth.loggedIn">
                  <RouterLink
                    v-if="showAdminShortcut"
                    to="/admin/dashboard"
                    class="btn btn-primary topbar-admin-link"
                    >管理</RouterLink
                  >
                  <button type="button" class="btn btn-ghost topbar-logout-button" @click="logout"
                    >退出</button
                  >
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main
      :class="[
        'app-main',
        {
          'app-main--catalog': isCatalogRoute,
          'app-main--admin': isAdminRoute,
          'app-main--login': isLoginRoute,
          'app-main--viewer': isViewerRoute,
          'app-main--library': isLibraryRoute,
        },
      ]"
    >
      <RouterView />
    </main>
    <div v-if="loginOpen" class="modal-backdrop" @click="closeLogin">
      <div
        ref="modalCardRef"
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        @click.stop
      >
        <h2 id="login-title" class="modal-title">管理员登录</h2>
        <form class="modal-form" @submit.prevent="submitLogin">
          <label class="field">
            <span>用户名</span>
            <input
              ref="loginUsernameInputRef"
              v-model="loginUsername"
              class="field-input"
              type="text"
              name="username"
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              @input="clearLoginError"
            />
          </label>
          <label class="field">
            <span>密码</span>
            <input
              v-model="loginPassword"
              class="field-input"
              type="password"
              name="password"
              autocomplete="current-password"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              @input="clearLoginError"
            />
          </label>
          <div v-if="loginError" class="error">{{ loginError }}</div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="closeLogin">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="auth.loading">登录</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped src="./AppShell.css"></style>
