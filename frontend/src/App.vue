<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { resolveAdminRedirect } from "./router/redirect";
import type { ApiError } from "./features/auth/authApi";
import { useAuthStore } from "./features/auth/useAuthStore";
import { useCatalogSearch } from "./features/catalog/catalogSearch";
import { useTheme } from "./composables/useTheme";
import { applyStoredClassroomMode, toggleClassroomMode } from "./features/classroom/classroomMode";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PerfMetrics from "@/components/dev/PerfMetrics.vue";
import PwaNetworkStatus from "@/components/PwaNetworkStatus.vue";
import PwaInstallPrompt from "@/components/PwaInstallPrompt.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Search, GraduationCap, User, LogOut, LayoutDashboard, Menu, X } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { isDark, toggleTheme } = useTheme();

// State
const loginOpen = ref(false);
const loginUsername = ref("");
const loginPassword = ref("");
const loginError = ref("");
const isDev = import.meta.env.DEV;
const classroomModeEnabled = ref(false);
const mobileMenuOpen = ref(false);
const topbarRef = ref<HTMLElement | null>(null);
const loginUsernameInputRef = ref<(ComponentPublicInstance & { $el?: Element | null }) | HTMLInputElement | null>(null);
const isScrolled = ref(false);

// Computed
const currentPath = computed(() => String(route.path || ""));
const isLoginRoute = computed(() => currentPath.value === "/login");
const isCatalogRoute = computed(() => currentPath.value === "/");
const isAdminShellRoute = computed(() => currentPath.value.startsWith("/admin") || currentPath.value === "/login");
const isAdminRoute = computed(() => currentPath.value.startsWith("/admin"));
const isViewerRoute = computed(() => currentPath.value.startsWith("/viewer"));
const isLibraryRoute = computed(() => currentPath.value.startsWith("/library"));
const showAdminShortcut = computed(() => auth.loggedIn && !isAdminShellRoute.value);
const catalogQuery = useCatalogSearch();

// Helpers
let lastFocusedBeforeLogin: HTMLElement | null = null;
let bodyOverflowBeforeLogin = "";
let topbarResizeObserver: ResizeObserver | null = null;

function openLogin() {
  mobileMenuOpen.value = false;
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

function clearLoginError() {
  if (!loginError.value) return;
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
    const redirect = resolveAdminRedirect(route.query.redirect);
    closeLogin();
    await router.replace(redirect);
  } catch (err) {
    loginError.value = toLoginMessage(err);
  }
}

async function logout() {
  mobileMenuOpen.value = false;
  auth.logout();
  if (String(route.path || "").startsWith("/admin")) {
    await router.replace("/");
  }
}

function handleAuthExpired() {
  mobileMenuOpen.value = false;
  auth.logout();
  const currentPath = String(route.fullPath || "");
  if (currentPath.startsWith("/admin")) {
    void router.replace({
      path: "/login",
      query: { redirect: currentPath },
    });
  }
}

function toggleClassroom() {
  classroomModeEnabled.value = toggleClassroomMode();
}

function syncTopbarHeight() {
  const topbarHeight = Math.ceil(topbarRef.value?.getBoundingClientRect().height || 0);
  document.documentElement.style.setProperty("--app-topbar-height", `${topbarHeight}px`);
}

function handleScroll() {
  isScrolled.value = window.scrollY > 10;
}

onMounted(async () => {
  window.addEventListener("pa-auth-expired", handleAuthExpired as EventListener);
  window.addEventListener("scroll", handleScroll, { passive: true });
  classroomModeEnabled.value = applyStoredClassroomMode();
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
    await nextTick();
    const inputEl =
      loginUsernameInputRef.value instanceof HTMLInputElement
        ? loginUsernameInputRef.value
        : loginUsernameInputRef.value && "$el" in loginUsernameInputRef.value
          ? loginUsernameInputRef.value.$el?.querySelector("input")
          : null;
    inputEl?.focus();
    return;
  }
  document.body.style.overflow = bodyOverflowBeforeLogin;
  bodyOverflowBeforeLogin = "";
  const restoreTarget = lastFocusedBeforeLogin;
  lastFocusedBeforeLogin = null;
  restoreTarget?.focus();
});

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false;
  },
);

onBeforeUnmount(() => {
  window.removeEventListener("pa-auth-expired", handleAuthExpired as EventListener);
  window.removeEventListener("scroll", handleScroll);
  topbarResizeObserver?.disconnect();
  topbarResizeObserver = null;
  document.documentElement.style.removeProperty("--app-topbar-height");
  document.body.style.overflow = bodyOverflowBeforeLogin;
});
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header
      ref="topbarRef"
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      :class="[
        isScrolled || mobileMenuOpen
          ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-sm'
          : 'bg-transparent',
      ]"
    >
      <div class="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div class="flex h-16 items-center justify-between gap-4">
          <div class="flex items-center gap-6">
            <RouterLink
              to="/"
              class="font-serif text-xl font-normal tracking-wide text-foreground transition-opacity hover:opacity-60"
            >
              演示工坊
            </RouterLink>

            <div v-if="isCatalogRoute" class="hidden md:flex items-center">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  :model-value="catalogQuery"
                  type="search"
                  placeholder="搜索演示..."
                  class="h-9 w-64 rounded-full border-border bg-muted pl-9 text-sm focus-visible:ring-primary"
                  @update:model-value="catalogQuery = $event"
                />
              </div>
            </div>
          </div>

          <div class="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              class="gap-2 rounded-full"
              :class="classroomModeEnabled ? 'bg-secondary text-secondary-foreground' : ''"
              @click="toggleClassroom"
            >
              <GraduationCap class="h-4 w-4" />
              <span>课堂模式</span>
            </Button>

            <Button variant="ghost" size="icon" class="rounded-full" @click="toggleTheme">
              <Sun v-if="isDark" class="h-4 w-4" />
              <Moon v-else class="h-4 w-4" />
            </Button>

            <template v-if="!auth.loggedIn && !isLoginRoute">
              <Button size="sm" class="rounded-full px-4" @click="openLogin">登录</Button>
            </template>

            <template v-else-if="auth.loggedIn">
              <Button v-if="showAdminShortcut" variant="outline" size="sm" class="gap-2 rounded-full" as-child>
                <RouterLink to="/admin/dashboard">
                  <LayoutDashboard class="h-4 w-4" />
                  管理
                </RouterLink>
              </Button>
              <Button variant="ghost" size="sm" class="gap-2 rounded-full text-muted-foreground" @click="logout">
                <LogOut class="h-4 w-4" />
                退出
              </Button>
            </template>
          </div>

          <button
            class="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <X v-if="mobileMenuOpen" class="h-5 w-5" />
            <Menu v-else class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div v-if="isCatalogRoute && mobileMenuOpen" class="border-t border-border px-4 py-3 md:hidden">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            :model-value="catalogQuery"
            type="search"
            placeholder="搜索演示..."
            class="h-10 w-full rounded-full border-border bg-muted pl-9"
            @update:model-value="catalogQuery = $event"
          />
        </div>
      </div>

      <div
        v-if="mobileMenuOpen"
        class="border-t border-border bg-background px-4 py-4 md:hidden"
      >
        <div class="flex flex-col gap-2">
          <Button
            variant="ghost"
            class="justify-start gap-3 rounded-xl"
            :class="classroomModeEnabled ? 'bg-secondary' : ''"
            @click="toggleClassroom"
          >
            <GraduationCap class="h-4 w-4" />
            课堂模式
          </Button>

          <Button variant="ghost" class="justify-start gap-3 rounded-xl" @click="toggleTheme">
            <Sun v-if="isDark" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
            {{ isDark ? "浅色模式" : "深色模式" }}
          </Button>

          <template v-if="!auth.loggedIn && !isLoginRoute">
            <Button class="justify-start gap-3 rounded-xl" @click="openLogin">
              <User class="h-4 w-4" />
              管理员登录
            </Button>
          </template>

          <template v-else-if="auth.loggedIn">
            <Button v-if="showAdminShortcut" variant="ghost" class="justify-start gap-3 rounded-xl" as-child>
              <RouterLink to="/admin/dashboard">
                <LayoutDashboard class="h-4 w-4" />
                管理后台
              </RouterLink>
            </Button>
            <Button variant="ghost" class="justify-start gap-3 rounded-xl text-muted-foreground" @click="logout">
              <LogOut class="h-4 w-4" />
              退出登录
            </Button>
          </template>
        </div>
      </div>
    </header>

    <main
      class="transition-all"
      :class="[
        isAdminRoute ? 'app-main--admin pt-0' : 'pt-16',
        isCatalogRoute ? 'app-main--catalog' : '',
        isViewerRoute ? 'app-main--viewer' : '',
        isLibraryRoute ? 'app-main--library' : '',
      ]"
    >
      <RouterView />
    </main>

    <Dialog :open="loginOpen" @update:open="(v) => { if (!v) closeLogin(); }">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>管理员登录</DialogTitle>
          <DialogDescription>请输入管理员账号和密码以进入后台</DialogDescription>
        </DialogHeader>

        <form class="mt-2 space-y-4" @submit.prevent="submitLogin">
          <div class="space-y-2">
            <label class="text-sm font-medium">用户名</label>
            <Input
              ref="loginUsernameInputRef"
              v-model="loginUsername"
              type="text"
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              placeholder="admin"
              @input="clearLoginError"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">密码</label>
            <Input
              v-model="loginPassword"
              type="password"
              autocomplete="current-password"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              placeholder="••••••"
              @input="clearLoginError"
            />
          </div>

          <div v-if="loginError" class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ loginError }}
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" @click="closeLogin">取消</Button>
            <Button type="submit" :disabled="auth.loading">
              {{ auth.loading ? "登录中..." : "登录" }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <PerfMetrics v-if="isDev" />
    <PwaNetworkStatus />
    <PwaInstallPrompt />
  </div>
</template>
