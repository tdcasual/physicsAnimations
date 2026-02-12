<script setup lang="ts">
import { ref } from "vue";
import { setToken } from "../../features/auth/authApi";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { updateAccount } from "../../features/admin/adminApi";

const auth = useAuthStore();

const saving = ref(false);
const errorText = ref("");
const successText = ref("");

const currentPassword = ref("");
const newUsername = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

async function submit() {
  errorText.value = "";
  successText.value = "";

  if (!currentPassword.value) {
    errorText.value = "请输入当前密码。";
    return;
  }
  if (!newUsername.value.trim() && !newPassword.value) {
    errorText.value = "请填写新用户名或新密码。";
    return;
  }
  if (newPassword.value && newPassword.value !== confirmPassword.value) {
    errorText.value = "两次密码不一致。";
    return;
  }

  saving.value = true;
  try {
    const data = await updateAccount({
      currentPassword: currentPassword.value,
      newUsername: newUsername.value.trim() || undefined,
      newPassword: newPassword.value || undefined,
    });

    if (data?.token) setToken(data.token);
    if (typeof data?.username === "string") {
      auth.username = data.username;
      auth.loggedIn = true;
      newUsername.value = data.username;
    }
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    successText.value = "账号信息已更新。";
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401 && e?.data?.error === "invalid_credentials") {
      errorText.value = "当前密码错误。";
      return;
    }
    if (e?.data?.error === "no_changes") {
      errorText.value = "请填写新用户名或新密码。";
      return;
    }
    errorText.value = e?.status === 401 ? "请先登录管理员账号。" : "更新账号失败。";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="admin-account-view">
    <h2>账号设置</h2>
    <div v-if="errorText" class="error-text">{{ errorText }}</div>
    <div v-if="successText" class="success-text">{{ successText }}</div>

    <form class="panel" @submit.prevent="submit">
      <div class="current-user">
        当前登录用户：<strong>{{ auth.username || "-" }}</strong>
      </div>

      <label class="field">
        <span>当前密码</span>
        <input
          v-model="currentPassword"
          class="field-input"
          type="password"
          name="current_password"
          autocomplete="current-password"
        />
      </label>

      <label class="field">
        <span>新用户名（可选）</span>
        <input v-model="newUsername" class="field-input" type="text" name="username" autocomplete="username" />
      </label>

      <label class="field">
        <span>新密码（可选）</span>
        <input v-model="newPassword" class="field-input" type="password" name="new_password" autocomplete="new-password" />
      </label>

      <label class="field">
        <span>确认新密码</span>
        <input
          v-model="confirmPassword"
          class="field-input"
          type="password"
          name="confirm_new_password"
          autocomplete="new-password"
        />
      </label>

      <div class="actions">
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

h2 {
  margin: 0;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 10px;
}

.current-user {
  color: var(--muted);
  font-size: 14px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.field-input {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  padding: 8px 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--surface);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}

.success-text {
  color: #15803d;
  font-size: 13px;
}
</style>
