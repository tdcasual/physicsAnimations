<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { RouterLink, useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from './stores/auth'
  import { initTheme, toggleTheme, toggleClassroomMode, type Theme, type ClassroomMode } from './features/theme/theme'
  import { resolveTopbarModeClass, resolveTopbarSearchState } from './features/app/appShellTopbar'
  import { resolveAdminRedirect } from './router/redirect'
  import { useCatalogSearch } from './features/catalog/catalogSearch'
  import { debounce } from './utils/debounce'
  import { useLoginModal } from './features/auth/useLoginModal'
  import OfflineIndicator from './components/OfflineIndicator.vue'
  import PwaInstallPrompt from './components/PwaInstallPrompt.vue'

  const router = useRouter()
  const route = useRoute()
  const auth = useAuthStore()

  const theme = ref<Theme>('system')
  const classroom = ref<ClassroomMode>('off')
  const topbarRef = ref<HTMLElement | null>(null)
  const topbarUtilityOpen = ref(false)

  const {
    loginOpen, loginUsername, loginPassword, loginError,
    loginUsernameInputRef, modalCardRef,
    openLogin, closeLogin, clearLoginError, submitLogin, handleLoginModalKeydown,
  } = useLoginModal()

  const currentPath = computed(() => String(route.path || ''))
  const isLoginRoute = computed(() => currentPath.value === '/login')
  const isCatalogRoute = computed(() => currentPath.value === '/')
  const isAdminShellRoute = computed(() => currentPath.value.startsWith('/admin') || currentPath.value === '/login')
  const isAdminRoute = computed(() => currentPath.value.startsWith('/admin'))
  const isViewerRoute = computed(() => currentPath.value.startsWith('/viewer'))
  const isLibraryRoute = computed(() => currentPath.value.startsWith('/library'))
  const showAdminShortcut = computed(() => auth.loggedIn && !isAdminShellRoute.value)
  const classroomModeLabel = computed(() => `课堂模式${classroom.value === 'on' ? '开' : '关'}`)
  const topbarMoreSummary = computed(() => (auth.loggedIn ? '账号与后台' : '设置与登录'))

  const catalogQuery = useCatalogSearch()
  const topbarSearchState = computed(() => resolveTopbarSearchState(currentPath.value))
  const topbarModeClass = computed(() => resolveTopbarModeClass(currentPath.value))

  const onTopbarSearch = debounce((event: Event) => {
    catalogQuery.value = (event.target as HTMLInputElement).value
  }, 200)

  function onBackdropTouch(e: TouchEvent) { e.stopPropagation(); closeLogin() }

  function toggleTopbarUtilityPanel() { topbarUtilityOpen.value = !topbarUtilityOpen.value }

  function toggleClassroom() {
    classroom.value = toggleClassroomMode(classroom.value)
    topbarUtilityOpen.value = false
  }

  function toggleThemeMode() {
    theme.value = toggleTheme(theme.value)
    topbarUtilityOpen.value = false
  }

  async function logout() {
    topbarUtilityOpen.value = false
    auth.logout()
    if (String(route.path || '').startsWith('/admin')) await router.replace('/')
  }

  function handleAuthExpired() {
    topbarUtilityOpen.value = false
    auth.logout()
    const currentPath = String(route.fullPath || '')
    if (currentPath.startsWith('/admin')) void router.replace({ path: '/login', query: { redirect: currentPath } })
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
      topbarResizeObserver = new ResizeObserver(() => syncTopbarHeight())
      topbarResizeObserver.observe(topbarRef.value)
    }
    await auth.bootstrap()
    await nextTick()
    syncTopbarHeight()
  })

  watch(() => route.fullPath, () => { topbarUtilityOpen.value = false })

  onBeforeUnmount(() => {
    window.removeEventListener('pa-auth-expired', handleAuthExpired as EventListener)
    window.removeEventListener('keydown', handleLoginModalKeydown)
    topbarResizeObserver?.disconnect()
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
              <span class="brand-lockup"><span class="brand-mark">科学演示集</span></span>
            </RouterLink>
            <RouterLink v-if="!isCatalogRoute" to="/" class="btn btn-ghost btn-nav-home topbar-home-link" aria-label="浏览首页">
              <span class="topbar-home-label">首页</span>
            </RouterLink>
            <label v-if="topbarSearchState.kind === 'input'" class="topbar-search-field">
              <span class="sr-only">搜索</span>
              <input :value="catalogQuery" class="topbar-search" type="search" :placeholder="topbarSearchState.placeholder" autocomplete="off" @input="onTopbarSearch" />
            </label>
            <RouterLink v-else :to="topbarSearchState.target || '/'" class="topbar-search-launch" :aria-label="topbarSearchState.placeholder">
              <span class="topbar-search-launch-kicker">查找演示</span>
              <span class="topbar-search-launch-label">{{ topbarSearchState.placeholder }}</span>
            </RouterLink>
          </div>
          <div class="topbar-actions">
            <div class="topbar-inline-actions">
              <button type="button" class="btn btn-ghost" :aria-pressed="classroom === 'on'" @click="toggleClassroom">{{ classroomModeLabel }}</button>
              <button type="button" class="btn btn-ghost" @click="toggleThemeMode">昼夜主题</button>
              <button v-if="!auth.loggedIn && !isLoginRoute" type="button" class="btn btn-primary" @click="openLogin">登录</button>
              <template v-else-if="auth.loggedIn">
                <RouterLink v-if="showAdminShortcut" to="/admin/dashboard" class="btn btn-primary topbar-admin-link">管理</RouterLink>
                <button type="button" class="btn btn-ghost topbar-logout-button" @click="logout">退出</button>
              </template>
            </div>
            <button type="button" class="btn btn-ghost topbar-more-trigger" :class="{ 'is-open': topbarUtilityOpen }" :aria-expanded="topbarUtilityOpen ? 'true' : 'false'" aria-controls="topbar-more-panel" :aria-label="`更多：${topbarMoreSummary}`" @click="toggleTopbarUtilityPanel">
              <span class="topbar-more-trigger-label">更多</span>
            </button>
            <div id="topbar-more-panel" class="topbar-more-panel" :class="{ 'is-open': topbarUtilityOpen }" :aria-hidden="topbarUtilityOpen ? 'false' : 'true'">
              <div class="topbar-more-group">
                <p class="topbar-more-group-label">界面与课堂</p>
                <button type="button" class="btn btn-ghost" :aria-pressed="classroom === 'on'" @click="toggleClassroom">{{ classroomModeLabel }}</button>
                <button type="button" class="btn btn-ghost" @click="toggleThemeMode">昼夜主题</button>
              </div>
              <div class="topbar-more-group">
                <p class="topbar-more-group-label">{{ auth.loggedIn ? '账号与后台' : '登录与后台' }}</p>
                <button v-if="!auth.loggedIn && !isLoginRoute" type="button" class="btn btn-primary" @click="openLogin">登录</button>
                <template v-else-if="auth.loggedIn">
                  <RouterLink v-if="showAdminShortcut" to="/admin/dashboard" class="btn btn-primary topbar-admin-link">管理</RouterLink>
                  <button type="button" class="btn btn-ghost topbar-logout-button" @click="logout">退出</button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main :class="['app-main', { 'app-main--catalog': isCatalogRoute, 'app-main--admin': isAdminRoute, 'app-main--login': isLoginRoute, 'app-main--viewer': isViewerRoute, 'app-main--library': isLibraryRoute }]">
      <RouterView />
    </main>
    <div v-if="loginOpen" class="modal-backdrop" @click="closeLogin" @touchstart.passive="onBackdropTouch">
      <div ref="modalCardRef" class="modal-card" role="dialog" aria-modal="true" aria-labelledby="login-title" @click.stop>
        <h2 id="login-title" class="modal-title">管理员登录</h2>
        <form class="modal-form" @submit.prevent="submitLogin">
          <label class="field">
            <span>用户名</span>
            <input ref="loginUsernameInputRef" v-model="loginUsername" class="field-input" type="text" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" @input="clearLoginError" />
          </label>
          <label class="field">
            <span>密码</span>
            <input v-model="loginPassword" class="field-input" type="password" name="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" @input="clearLoginError" />
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
