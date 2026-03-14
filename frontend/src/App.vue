<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { resolveAdminRedirect } from "./router/redirect";
import type { ApiError } from "./features/auth/authApi";
import { useAuthStore } from "./features/auth/useAuthStore";
import { applyStoredClassroomMode, toggleClassroomMode } from "./features/classroom/classroomMode";
import { applyStoredTheme, toggleTheme } from "./features/theme/theme";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const loginOpen = ref(false);
const loginUsername = ref("");
const loginPassword = ref("");
const loginError = ref("");
const classroomModeEnabled = ref(false);
const topbarUtilityOpen = ref(false);
const topbarRef = ref<HTMLElement | null>(null);
const modalCardRef = ref<HTMLElement | null>(null);
const loginUsernameInputRef = ref<HTMLInputElement | null>(null);
const isLoginRoute = computed(() => String(route.path || "") === "/login");
const isCatalogRoute = computed(() => String(route.path || "") === "/");
const classroomModeLabel = computed(() => `课堂放大${classroomModeEnabled.value ? "开" : "关"}`);
const topbarNote = computed(() => {
  const currentPath = String(route.path || "");
  if (currentPath.startsWith("/admin")) {
    return "管理工作台 · 上传演示 · 资源归档";
  }
  if (currentPath.startsWith("/viewer")) {
    return "演示舞台 · 返回目录可继续检索";
  }
  if (currentPath.startsWith("/library")) {
    return "资源档案 · 文件夹浏览";
  }
  return "检索课堂演示 · 分章浏览 · 资源归档";
});

let lastFocusedBeforeLogin: HTMLElement | null = null;
let bodyOverflowBeforeLogin = "";
let topbarResizeObserver: ResizeObserver | null = null;

function openLogin() {
  topbarUtilityOpen.value = false;
  lastFocusedBeforeLogin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  loginOpen.value = true;
  loginError.value = "";
}

function closeLogin() {
  loginOpen.value = false;
  loginError.value = "";
  loginUsername.value = "";
  loginPassword.value = "";
}

function getModalFocusables(): HTMLElement[] {
  if (!modalCardRef.value) return [];
  const focusable = modalCardRef.value.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])',
  );
  return Array.from(focusable).filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    return !node.hasAttribute("disabled") && node.tabIndex !== -1;
  });
}

function handleLoginModalKeydown(event: KeyboardEvent) {
  if (!loginOpen.value) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeLogin();
    return;
  }

  if (event.key !== "Tab") return;

  const focusables = getModalFocusables();
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;
  const inModal = active ? modalCardRef.value?.contains(active) === true : false;

  if (event.shiftKey) {
    if (!inModal || active === first) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (!inModal || active === last) {
    event.preventDefault();
    first.focus();
  }
}

function clearLoginError() {
  if (!loginError.value) return;
  loginError.value = "";
}

function toggleTopbarUtilityPanel() {
  topbarUtilityOpen.value = !topbarUtilityOpen.value;
}

function toggleClassroom() {
  classroomModeEnabled.value = toggleClassroomMode();
  topbarUtilityOpen.value = false;
}

function toggleThemeMode() {
  toggleTheme();
  topbarUtilityOpen.value = false;
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
    const redirect = resolveAdminRedirect(route.query.redirect);
    closeLogin();
    await router.replace(redirect);
  } catch (err) {
    loginError.value = toLoginMessage(err);
  }
}

async function logout() {
  topbarUtilityOpen.value = false;
  auth.logout();
  if (String(route.path || "").startsWith("/admin")) {
    await router.replace("/");
  }
}

function handleAuthExpired() {
  topbarUtilityOpen.value = false;
  auth.logout();
  const currentPath = String(route.fullPath || "");
  if (currentPath.startsWith("/admin")) {
    void router.replace({
      path: "/login",
      query: { redirect: currentPath },
    });
  }
}

function syncTopbarHeight() {
  const topbarHeight = Math.ceil(topbarRef.value?.getBoundingClientRect().height || 0);
  document.documentElement.style.setProperty("--app-topbar-height", `${topbarHeight}px`);
}

onMounted(async () => {
  window.addEventListener("pa-auth-expired", handleAuthExpired as EventListener);
  classroomModeEnabled.value = applyStoredClassroomMode();
  applyStoredTheme();
  await nextTick();
  syncTopbarHeight();
  if (typeof ResizeObserver !== "undefined" && topbarRef.value) {
    topbarResizeObserver = new ResizeObserver(() => {
      syncTopbarHeight();
    });
    topbarResizeObserver.observe(topbarRef.value);
  }
  await auth.bootstrap();
  await nextTick();
  syncTopbarHeight();
});

watch(loginOpen, async (open) => {
  if (open) {
    bodyOverflowBeforeLogin = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleLoginModalKeydown);
    await nextTick();
    loginUsernameInputRef.value?.focus();
    return;
  }

  window.removeEventListener("keydown", handleLoginModalKeydown);
  document.body.style.overflow = bodyOverflowBeforeLogin;
  bodyOverflowBeforeLogin = "";
  const restoreTarget = lastFocusedBeforeLogin;
  lastFocusedBeforeLogin = null;
  restoreTarget?.focus();
});

watch(
  () => route.fullPath,
  () => {
    topbarUtilityOpen.value = false;
  },
);

onBeforeUnmount(() => {
  window.removeEventListener("pa-auth-expired", handleAuthExpired as EventListener);
  window.removeEventListener("keydown", handleLoginModalKeydown);
  topbarResizeObserver?.disconnect();
  topbarResizeObserver = null;
  document.documentElement.style.removeProperty("--app-topbar-height");
  document.body.style.overflow = bodyOverflowBeforeLogin;
});
</script>

<template>
  <div class="app-shell">
    <header ref="topbarRef" class="topbar">
      <div class="topbar-inner">
        <div class="topbar-lead">
          <div class="brand-stack">
            <RouterLink to="/" class="brand brand-link" aria-label="返回目录">
              <div class="brand-copy">
                <div class="brand-meta">教学实验图谱</div>
                <div class="brand-title">我的学科演示集</div>
                <div class="brand-subcopy">更快找到课堂演示与资源</div>
              </div>
            </RouterLink>
            <p class="topbar-note">{{ topbarNote }}</p>
          </div>

          <RouterLink v-if="!isCatalogRoute" to="/" class="btn btn-ghost btn-nav-home">浏览首页</RouterLink>
        </div>

        <div class="topbar-actions actions">
          <div class="topbar-primary-actions">
            <button v-if="!auth.loggedIn && !isLoginRoute" type="button" class="btn btn-primary" @click="openLogin">
              登录
            </button>
            <template v-if="auth.loggedIn">
              <RouterLink to="/admin/dashboard" class="btn btn-primary">管理</RouterLink>
              <button type="button" class="btn btn-ghost" @click="logout">退出</button>
            </template>
          </div>

          <button
            type="button"
            class="btn btn-ghost topbar-mobile-toggle"
            aria-label="切换环境设置"
            :aria-expanded="topbarUtilityOpen ? 'true' : 'false'"
            aria-controls="topbar-mobile-utility-panel"
            @click="toggleTopbarUtilityPanel"
          >
            环境
          </button>

          <div class="topbar-environment-shell">
            <span class="topbar-utility-label">环境偏好</span>
            <div class="topbar-utility-actions">
              <button type="button" class="btn btn-ghost" :aria-pressed="classroomModeEnabled" @click="toggleClassroom">
                {{ classroomModeLabel }}
              </button>
              <button type="button" class="btn btn-ghost" @click="toggleThemeMode">昼夜主题</button>
            </div>
          </div>

          <div
            id="topbar-mobile-utility-panel"
            class="topbar-mobile-utility-panel"
            :class="{ 'is-open': topbarUtilityOpen }"
            :aria-hidden="topbarUtilityOpen ? 'false' : 'true'"
          >
            <div class="topbar-mobile-utility-copy">环境偏好</div>
            <button type="button" class="btn btn-ghost" :aria-pressed="classroomModeEnabled" @click="toggleClassroom">
              {{ classroomModeLabel }}
            </button>
            <button type="button" class="btn btn-ghost" @click="toggleThemeMode">昼夜主题</button>
          </div>
        </div>
      </div>
    </header>

    <main class="app-main">
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
