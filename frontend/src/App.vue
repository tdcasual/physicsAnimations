<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { ApiError } from "./features/auth/authApi";
import { useAuthStore } from "./features/auth/useAuthStore";
import { applyStoredTheme, toggleTheme } from "./features/theme/theme";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const loginOpen = ref(false);
const loginUsername = ref("");
const loginPassword = ref("");
const loginError = ref("");

function openLogin() {
  loginOpen.value = true;
  loginError.value = "";
}

function closeLogin() {
  loginOpen.value = false;
  loginError.value = "";
}

function toLoginMessage(err: unknown): string {
  const e = err as ApiError;
  const status = e?.status;
  const retryAfterSeconds = e?.data?.retryAfterSeconds;

  if (window.location.protocol === "file:") {
    return "请先运行 npm start，再通过 http://localhost:4173 访问。";
  }
  if (status === 401) return "用户名或密码错误。";
  if (status === 429) {
    return retryAfterSeconds
      ? `尝试过于频繁，请 ${retryAfterSeconds} 秒后再试。`
      : "尝试过于频繁，请稍后再试。";
  }
  if (status === 404) return "未找到登录接口，请确认服务端已启动。";
  if (!status) return "无法连接服务端，请确认已运行 npm start。";
  return "登录失败，请稍后再试。";
}

async function submitLogin() {
  loginError.value = "";
  try {
    await auth.loginWithPassword({
      username: loginUsername.value,
      password: loginPassword.value,
    });
    loginPassword.value = "";
    closeLogin();
  } catch (err) {
    loginError.value = toLoginMessage(err);
  }
}

async function logout() {
  auth.logout();
  if (String(route.path || "").startsWith("/admin")) {
    await router.replace("/");
  }
}

onMounted(async () => {
  applyStoredTheme();
  await auth.bootstrap();
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-title">我的物理动画集</div>
          <div class="brand-subtitle">Vue SPA（迁移中）</div>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-ghost" @click="toggleTheme()">主题</button>
          <button v-if="!auth.loggedIn" type="button" class="btn btn-primary" @click="openLogin">登录</button>
          <template v-else>
            <RouterLink to="/admin/dashboard" class="btn btn-primary">管理</RouterLink>
            <button type="button" class="btn btn-ghost" @click="logout">退出</button>
          </template>
        </div>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <div v-if="loginOpen" class="modal-backdrop" @click="closeLogin">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="login-title" @click.stop>
        <h2 id="login-title" class="modal-title">管理员登录</h2>

        <label class="field">
          <span>用户名</span>
          <input v-model="loginUsername" class="field-input" type="text" autocomplete="username" />
        </label>

        <label class="field">
          <span>密码</span>
          <input
            v-model="loginPassword"
            class="field-input"
            type="password"
            autocomplete="current-password"
            @keydown.enter.prevent="submitLogin"
          />
        </label>

        <div v-if="loginError" class="error">{{ loginError }}</div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="closeLogin">取消</button>
          <button type="button" class="btn btn-primary" :disabled="auth.loading" @click="submitLogin">登录</button>
        </div>
      </div>
    </div>
  </div>
</template>
