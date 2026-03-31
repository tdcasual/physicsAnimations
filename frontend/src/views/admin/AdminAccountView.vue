<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { setToken } from '../../features/auth/authApi'
  import { useAuthStore } from '../../stores/auth'
  import { updateAccount } from '../../features/admin/adminApi'
  import { usePendingChangesGuard } from '../../features/admin/composables/usePendingChangesGuard'

  const auth = useAuthStore()

  const saving = ref(false)
  const errorText = ref('')
  const successText = ref('')
  const fieldErrors = ref<Record<string, string>>({})

  const currentPassword = ref('')
  const newUsername = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')

  function setFieldError(key: string, message: string) {
    fieldErrors.value = {
      ...fieldErrors.value,
      [key]: message,
    }
  }

  function clearFieldErrors(key?: string) {
    if (!key) {
      fieldErrors.value = {}
      return
    }
    if (!(key in fieldErrors.value)) return
    const next = { ...fieldErrors.value }
    delete next[key]
    fieldErrors.value = next
  }

  function getFieldError(key: string): string {
    return fieldErrors.value[key] || ''
  }

  function syncConfirmPasswordError() {
    if (!getFieldError('confirmPassword')) return
    if (!newPassword.value || newPassword.value === confirmPassword.value) {
      clearFieldErrors('confirmPassword')
    }
  }

  watch([newPassword, confirmPassword], () => {
    syncConfirmPasswordError()
  })

  const hasPendingChanges = computed(() =>
    Boolean(
      currentPassword.value || newUsername.value || newPassword.value || confirmPassword.value
    )
  )

  usePendingChangesGuard({
    hasPendingChanges,
    isBlocked: saving,
    message: '账号信息有未保存更改，确定离开当前页面吗？',
  })

  async function submit() {
    errorText.value = ''
    successText.value = ''
    clearFieldErrors()

    if (!currentPassword.value) {
      setFieldError('currentPassword', '请输入当前密码。')
      return
    }
    if (newUsername.value && !newUsername.value.trim()) {
      setFieldError('newUsername', '新用户名不能只包含空白字符。')
      return
    }
    if (newPassword.value && !newPassword.value.trim()) {
      setFieldError('newPassword', '新密码不能只包含空白字符。')
      return
    }
    if (!newUsername.value.trim() && !newPassword.value.trim()) {
      setFieldError('newUsername', '请填写新用户名或新密码。')
      setFieldError('newPassword', '请填写新用户名或新密码。')
      return
    }
    if (newPassword.value && newPassword.value !== confirmPassword.value) {
      setFieldError('confirmPassword', '两次密码不一致。')
      return
    }

    saving.value = true
    try {
      const data = await updateAccount({
        currentPassword: currentPassword.value,
        newUsername: newUsername.value.trim() || undefined,
        newPassword: newPassword.value || undefined,
      })

      if (data?.token) setToken(data.token)
      if (typeof data?.username === 'string') {
        auth.username = data.username
        auth.loggedIn = true
      }
      currentPassword.value = ''
      newUsername.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      successText.value = '账号信息已更新。'
    } catch (err) {
      const e = err as { status?: number; data?: any }
      if (e?.status === 401 && e?.data?.error === 'invalid_credentials') {
        setFieldError('currentPassword', '当前密码错误。')
      } else if (e?.data?.error === 'invalid_username') {
        setFieldError('newUsername', '新用户名不能只包含空白字符。')
      } else if (e?.data?.error === 'invalid_password') {
        setFieldError('newPassword', '新密码不能只包含空白字符。')
      } else if (e?.data?.error === 'no_changes') {
        setFieldError('newUsername', '请填写新用户名或新密码。')
        setFieldError('newPassword', '请填写新用户名或新密码。')
      } else {
        errorText.value = e?.status === 401 ? '请先登录管理员账号。' : '更新账号失败。'
      }
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <section class="admin-account-view">
    <header class="admin-page-header admin-page-header--account">
      <div class="admin-page-copy">
        <p class="admin-page-kicker">权限与身份</p>
        <h2>账号设置</h2>
      </div>
      <div class="admin-page-meta">
        <span class="admin-page-meta-label">当前账号</span>
        <strong>{{ auth.username || '未命名管理员' }}</strong>
      </div>
    </header>
    <div v-if="errorText" class="error-text admin-feedback error">{{ errorText }}</div>
    <div v-if="successText" class="success-text admin-feedback success">{{ successText }}</div>

    <form class="admin-card" @submit.prevent="submit">
      <div class="current-user">
        当前登录用户：<strong>{{ auth.username || '-' }}</strong>
      </div>

      <label class="field" :class="{ 'has-error': getFieldError('currentPassword') }">
        <span>当前密码</span>
        <input
          v-model="currentPassword"
          class="field-input"
          type="password"
          name="current_password"
          autocomplete="current-password"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :disabled="saving"
          @input="clearFieldErrors('currentPassword')"
        />
        <div v-if="getFieldError('currentPassword')" class="field-error-text">{{
          getFieldError('currentPassword')
        }}</div>
      </label>

      <label class="field" :class="{ 'has-error': getFieldError('newUsername') }">
        <span>新用户名（可选）</span>
        <input
          v-model="newUsername"
          class="field-input"
          type="text"
          name="username"
          autocomplete="username"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :disabled="saving"
          @input="clearFieldErrors('newUsername')"
        />
        <div v-if="getFieldError('newUsername')" class="field-error-text">{{
          getFieldError('newUsername')
        }}</div>
      </label>

      <label class="field" :class="{ 'has-error': getFieldError('newPassword') }">
        <span>新密码（可选）</span>
        <input
          v-model="newPassword"
          class="field-input"
          type="password"
          name="new_password"
          autocomplete="new-password"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :disabled="saving"
          @input="clearFieldErrors('newPassword')"
        />
        <div v-if="getFieldError('newPassword')" class="field-error-text">{{
          getFieldError('newPassword')
        }}</div>
      </label>

      <label class="field" :class="{ 'has-error': getFieldError('confirmPassword') }">
        <span>确认新密码</span>
        <input
          v-model="confirmPassword"
          class="field-input"
          type="password"
          name="confirm_new_password"
          autocomplete="new-password"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :disabled="saving"
          @input="clearFieldErrors('confirmPassword')"
        />
        <div v-if="getFieldError('confirmPassword')" class="field-error-text">{{
          getFieldError('confirmPassword')
        }}</div>
      </label>

      <div class="actions admin-actions">
        <button type="submit" class="btn btn-primary" :disabled="saving">保存</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
  .admin-account-view {
    display: grid;
    gap: 12px;
  }

  form.admin-card {
    max-width: 480px;
  }

  .current-user {
    color: var(--muted);
    font-size: var(--text-admin-sm);
  }
</style>
