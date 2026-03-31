<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { RouterLink, useRoute, useRouter } from 'vue-router'
  import { PButton, PInput, PCard } from '../components/ui'
  import { useAuthStore } from '../stores/auth'
  import { resolveAdminRedirect } from '../router/redirect'

  const router = useRouter()
  const route = useRoute()
  const auth = useAuthStore()

  const username = ref('')
  const password = ref('')
  const errorText = ref('')
  const loading = ref(false)

  onMounted(() => {
    document.title = '管理员登录 - 科学演示集'
  })

  function clearError() {
    errorText.value = ''
  }

  async function submit() {
    // 幂等保护：防止重复提交
    if (loading.value) return
    
    if (!username.value || !password.value) {
      errorText.value = '请输入用户名和密码'
      return
    }

    loading.value = true
    errorText.value = ''

    try {
      await auth.loginWithPassword({
        username: username.value,
        password: password.value,
      })
      const redirect = resolveAdminRedirect(route.query.redirect)
      await router.replace(redirect)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 401) {
        errorText.value = '用户名或密码错误'
      } else if (status === 429) {
        const retry = Number(
          (err as { data?: { retryAfterSeconds?: number } })?.data?.retryAfterSeconds || 0
        )
        errorText.value =
          retry > 0 ? `尝试过于频繁，请 ${retry} 秒后再试` : '尝试过于频繁，请稍后再试'
      } else {
        errorText.value = '登录失败，请检查网络连接'
      }
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <PCard padding="lg" class="login-card">
        <div class="login-header">
          <div class="login-brand">
            <span class="brand-icon">🔬</span>
            <span class="brand-text">科学演示集</span>
          </div>
          <h1 class="login-title">管理员登录</h1>
          <p class="login-subtitle"> 登录后可管理演示内容、资源库、分类与系统配置 </p>
        </div>

        <form class="login-form" @submit.prevent="submit">
          <div class="form-field">
            <label for="login-username" class="form-label">用户名</label>
            <PInput
              id="login-username"
              v-model="username"
              placeholder="请输入用户名"
              size="lg"
              autocomplete="username"
              aria-label="用户名"
              @input="clearError"
            />
          </div>

          <div class="form-field">
            <label for="login-password" class="form-label">密码</label>
            <PInput
              id="login-password"
              v-model="password"
              type="password"
              placeholder="请输入密码"
              size="lg"
              autocomplete="current-password"
              aria-label="密码"
              @input="clearError"
            />
          </div>

          <div v-if="errorText" class="form-error" role="alert" aria-live="polite">
            <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
            {{ errorText }}
          </div>

          <div class="form-actions">
            <RouterLink to="/" class="back-link">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clip-rule="evenodd"
                />
              </svg>
              返回首页
            </RouterLink>
            <PButton
              variant="primary"
              size="lg"
              :loading="loading"
              class="submit-btn"
              type="submit"
            >
              登录
            </PButton>
          </div>
        </form>
      </PCard>

      <div class="login-info">
        <div class="info-item" title="内容管理">
          <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="info-text">内容管理</span>
        </div>
        <div class="info-item" title="资源库">
          <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="info-text">资源库</span>
        </div>
        <div class="info-item" title="分类配置">
          <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="info-text">分类配置</span>
        </div>
        <div class="info-item" title="系统设置">
          <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="info-text">系统设置</span>
        </div>
      </div>
    </div>

    <footer class="login-footer">
      <p>© 2024 高中物理动画演示系统</p>
    </footer>
  </div>
</template>

<style scoped>
  .login-page {
    min-height: 100dvh;
    min-height: -webkit-fill-available;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
    padding-bottom: max(var(--space-6), env(safe-area-inset-bottom, 0px));
    background: linear-gradient(135deg, var(--surface-bg) 0%, var(--surface-page) 100%);
  }

  .login-container {
    width: 100%;
    max-width: 420px;
  }

  .login-card {
    margin-bottom: var(--space-6);
  }

  .login-card :deep(.p-card) {
    padding: var(--space-8);
  }

  /* Header */
  .login-header {
    text-align: center;
    margin-bottom: var(--space-8);
  }

  .login-brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .brand-icon {
    font-size: var(--text-2xl);
  }

  .brand-text {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    background: linear-gradient(135deg, var(--primary-default), var(--accent-8));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .login-title {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--text-primary);
    margin: 0 0 var(--space-3);
    letter-spacing: -0.02em;
  }

  .login-subtitle {
    font-size: var(--text-base);
    color: var(--text-tertiary);
    margin: 0;
    line-height: var(--leading-relaxed);
  }

  /* Form */
  .login-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-secondary);
  }

  .form-error {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--danger-bg);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: var(--danger-9);
  }

  .error-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .form-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--space-2);
    gap: var(--space-4);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-tertiary);
    text-decoration: none;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    transition: color var(--duration-fast) var(--ease-smooth);
  }

  .back-link:hover {
    color: var(--text-primary);
  }

  .back-link svg {
    width: 16px;
    height: 16px;
  }

  .submit-btn {
    min-width: 120px;
    flex-shrink: 0;
  }

  /* Info */
  .login-info {
    display: flex;
    justify-content: center;
    gap: var(--space-6);
    flex-wrap: wrap;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    transition: color var(--duration-fast) var(--ease-smooth);
  }

  .info-item:hover {
    color: var(--text-secondary);
  }

  .info-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    opacity: 0.7;
  }

  /* Footer */
  .login-footer {
    margin-top: var(--space-10);
    text-align: center;
  }

  .login-footer p {
    font-size: var(--text-xs);
    color: var(--text-quaternary);
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .login-page {
      padding: var(--space-4);
      justify-content: flex-start;
      padding-top: var(--space-8);
    }

    .login-card :deep(.p-card) {
      padding: var(--space-6);
    }

    .login-header {
      margin-bottom: var(--space-6);
    }

    .login-title {
      font-size: var(--text-2xl);
    }

    .login-subtitle {
      font-size: var(--text-sm);
    }

    .form-actions {
      flex-direction: column;
      gap: var(--space-4);
      margin-top: var(--space-4);
    }

    .back-link {
      align-self: flex-start;
      font-size: var(--text-sm);
    }

    .submit-btn {
      width: 100%;
      order: -1;
    }

    .login-info {
      gap: var(--space-3);
      padding: 0 var(--space-2);
    }

    .info-item {
      flex-direction: column;
      gap: var(--space-1);
      text-align: center;
      min-width: 64px;
    }

    .info-icon {
      width: 24px;
      height: 24px;
    }

    .info-text {
      font-size: var(--text-xs);
    }

    .login-footer {
      margin-top: auto;
      padding-top: var(--space-6);
    }
  }

  @media (max-width: 380px) {
    .login-info {
      gap: var(--space-2);
    }

    .info-item {
      min-width: 56px;
    }

    .info-text {
      font-size: 11px;
    }
  }
</style>
