<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../features/auth/useAuthStore";
import { resolveAdminRedirect } from "../router/redirect";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const username = ref("");
const password = ref("");
const errorText = ref("");

onMounted(() => {
  document.title = "管理员登录 - 管理后台";
});

function clearErrorText() {
  if (!errorText.value) return;
  errorText.value = "";
}

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
    <div class="login-panel">
      <div class="login-intro">
        <p class="login-kicker">后台入口</p>
        <h1>管理员登录</h1>
        <p class="login-copy">登录后继续处理上传、资源归档与课堂目录整理。这个入口只负责进入工作台，不承担公开浏览。</p>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <span>用户名</span>
          <input
            v-model="username"
            class="field-input"
            type="text"
            autocomplete="username"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            @input="clearErrorText"
          />
        </label>

        <label class="field">
          <span>密码</span>
          <input
            v-model="password"
            class="field-input"
            type="password"
            autocomplete="current-password"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            @input="clearErrorText"
          />
        </label>

        <div v-if="errorText" class="error-text">{{ errorText }}</div>

        <div class="actions">
          <RouterLink class="btn btn-ghost" to="/">返回工作区目录</RouterLink>
          <button type="submit" class="btn btn-primary" :disabled="auth.loading">登录</button>
        </div>
      </form>

      <p class="login-note">如果你只是查找演示或资源，请直接返回公开目录；管理台仅用于编修和维护。</p>
    </div>
  </section>
</template>

<style scoped>
.login-view {
  width: min(720px, 100%);
  margin: 34px auto;
}

.login-panel {
  border: 1px solid color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 22px;
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--accent) 7%, var(--surface)), color-mix(in oklab, var(--surface) 94%, var(--paper))),
    var(--surface);
  box-shadow: 0 28px 58px -42px color-mix(in oklab, var(--ink) 28%, transparent);
  padding: clamp(16px, 2vw, 24px);
  display: grid;
  gap: 16px;
}

.login-intro {
  display: grid;
  gap: 8px;
}

.login-kicker {
  margin: 0;
  color: color-mix(in oklab, var(--accent-copper-strong) 74%, var(--text));
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-form {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid color-mix(in oklab, var(--line-strong) 16%, var(--border));
  border-radius: 18px;
  background: color-mix(in oklab, var(--surface) 90%, var(--paper));
}

h1 {
  margin: 0;
  font-family: "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(1.8rem, 1.35rem + 0.6vw, 2.4rem);
  line-height: 1.05;
}

.login-copy,
.login-note {
  margin: 0;
  color: var(--muted);
  max-width: 52ch;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}

@media (max-width: 640px) {
  .login-view {
    margin: 16px auto;
  }

  .actions > * {
    flex: 1 1 calc(50% - 4px);
  }
}
</style>
