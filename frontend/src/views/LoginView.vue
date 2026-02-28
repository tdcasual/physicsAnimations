<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../features/auth/useAuthStore";
import { resolveAdminRedirect } from "../router/redirect";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const username = ref("");
const password = ref("");
const errorText = ref("");

async function submit() {
  errorText.value = "";
  try {
    await auth.loginWithPassword({
      username: username.value,
      password: password.value,
    });
    const redirect = resolveAdminRedirect(route.query.redirect);
    await router.replace(redirect);
  } catch (err) {
    const e = err as { status?: number; data?: any };
    if (e?.status === 401) {
      errorText.value = "用户名或密码错误。";
      return;
    }
    if (e?.status === 429) {
      const retry = Number(e?.data?.retryAfterSeconds || 0);
      errorText.value = retry > 0 ? `尝试过于频繁，请 ${retry} 秒后再试。` : "尝试过于频繁，请稍后再试。";
      return;
    }
    errorText.value = "登录失败，请稍后再试。";
  }
}
</script>

<template>
  <section class="login-view">
    <h1>管理员登录</h1>
    <form class="login-form" @submit.prevent="submit">
      <label class="field">
        <span>用户名</span>
        <input v-model="username" class="field-input" type="text" autocomplete="username" />
      </label>

      <label class="field">
        <span>密码</span>
        <input
          v-model="password"
          class="field-input"
          type="password"
          autocomplete="current-password"
        />
      </label>

      <div v-if="errorText" class="error-text">{{ errorText }}</div>

      <div class="actions">
        <button type="submit" class="btn btn-primary" :disabled="auth.loading">登录</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.login-view {
  width: min(420px, 100%);
  margin: 30px auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 14px;
  display: grid;
  gap: 10px;
}

.login-form {
  display: grid;
  gap: 10px;
}

h1 {
  margin: 0;
  font-size: 20px;
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
  min-height: 40px;
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
  min-height: 40px;
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
</style>
