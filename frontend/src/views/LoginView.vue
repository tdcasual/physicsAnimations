<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { RouterLink, useRoute, useRouter } from 'vue-router'
  import { PButton, PInput, PCard } from '../components/ui'
  import { useAuthStore } from '../features/auth/useAuthStore'
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
    } catch (err: any) {
      const status = err?.status
      if (status === 401) {
        errorText.value = '用户名或密码错误'
      } else if (status === 429) {
        const retry = Number(err?.data?.retryAfterSeconds || 0)
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
            <label class="form-label">用户名</label>
            <PInput
              v-model="username"
              placeholder="请输入用户名"
              size="lg"
              autocomplete="username"
              @input="clearError"
            />
          </div>

          <div class="form-field">
            <label class="form-label">密码</label>
            <PInput
              v-model="password"
              type="password"
              placeholder="请输入密码"
              size="lg"
              autocomplete="current-password"
              @input="clearError"
            />
          </div>

          <div v-if="errorText" class="form-error">
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
              @click="submit"
            >
              登录
            </PButton>
          </div>
        </form>
      </PCard>

      <div class="login-info">
        <div class="info-item">
          <span class="info-icon">📚</span>
          <span>内容管理</span>
        </div>
        <div class="info-item">
          <span class="info-icon">📁</span>
          <span>资源库</span>
        </div>
        <div class="info-item">
          <span class="info-icon">🏷️</span>
          <span>分类配置</span>
        </div>
        <div class="info-item">
          <span class="info-icon">⚙️</span>
          <span>系统设置</span>
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
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
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
    font-size: 28px;
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
    background: oklch(55% 0.18 25 / 0.08);
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
  }

  .info-icon {
    font-size: 16px;
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
  @media (max-width: 480px) {
    .login-page {
      padding: var(--space-4);
    }

    .login-card :deep(.p-card) {
      padding: var(--space-6);
    }

    .login-title {
      font-size: var(--text-2xl);
    }

    .form-actions {
      flex-direction: column;
      gap: var(--space-3);
    }

    .back-link {
      order: 1;
    }

    .submit-btn {
      width: 100%;
    }

    .login-info {
      gap: var(--space-4);
    }
  }
</style>
