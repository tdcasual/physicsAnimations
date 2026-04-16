<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../features/auth/useAuthStore";
import { resolveAdminRedirect } from "../router/redirect";
import { extractApiError } from "../features/shared/apiError";
import { PAButton, PAField, PAInput, PAActions } from "@/components/ui/patterns";

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
    const e = extractApiError(err);
    if (e.status === 401) {
      errorText.value = "用户名或密码错误。";
      return;
    }
    if (e.status === 429) {
      const retry = Number(e.data?.retryAfterSeconds || 0);
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
        <h1>管理员登录</h1>
        <p class="login-copy">登录后可进入内容、资源库、分类与系统配置工作台，更适合在电脑端完成整理、核查与维护。</p>
      </div>

      <aside class="login-note" aria-label="桌面登录说明">
        <span class="login-note-label">桌面工作流</span>
        <strong>内容、资源库、分类与系统配置</strong>
        <p>登录后会优先回到你刚才准备处理的后台页面，适合连续整理内容、上传素材和检查分类配置。</p>
      </aside>

      <form class="login-form" @submit.prevent="submit">
        <PAField label="用户名">
          <PAInput
            v-model="username"
            type="text"
            autocomplete="username"
            @input="clearErrorText"
          />
        </PAField>

        <PAField label="密码">
          <PAInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            @input="clearErrorText"
          />
        </PAField>

        <div v-if="errorText" class="error-text">{{ errorText }}</div>

        <PAActions align="end">
          <PAButton as="a" variant="ghost" href="/">返回工作区目录</PAButton>
          <PAButton type="submit" :disabled="auth.loading">登录</PAButton>
        </PAActions>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login-view {
  width: min(560px, 100%);
  margin: 48px auto;
}

.login-panel {
  border: 1px solid var(--border);
  border-radius: var(--radius-l);
  background: var(--card);
  padding: clamp(20px, 3vw, 32px);
  display: grid;
  gap: 20px;
}

.login-intro {
  display: grid;
  gap: 8px;
}

.login-copy {
  margin: 0;
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale));
  line-height: 1.55;
}

.login-kicker {
  display: none;
}

.login-form {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 0;
  border-radius: var(--radius-m);
  background: var(--background);
}

.login-note {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-m);
  background: color-mix(in oklab, var(--card) 86%, var(--background));
}

.login-note-label {
  color: var(--primary);
  font-size: calc(11px * var(--ui-scale));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.login-note strong {
  font-size: calc(16px * var(--ui-scale));
  line-height: 1.2;
}

.login-note p {
  margin: 0;
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale));
  line-height: 1.55;
}

h1 {
  margin: 0;
  font-size: clamp(1.6rem, 1.2rem + 0.6vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.error-text {
  color: var(--destructive);
  font-size: calc(13px * var(--ui-scale));
}

@media (min-width: 960px) {
  .login-view {
    width: min(1180px, 100%);
  }

  .login-panel {
    grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
    align-items: start;
  }

  .login-intro {
    gap: 10px;
  }

  .login-note {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: stretch;
  }

  .login-form {
    grid-column: 1;
    padding: 22px;
  }
}

@media (max-width: 640px) {
  .login-view { margin: 20px auto; }
  .login-copy {
    display: none;
  }
  .actions > * { flex: 1 1 calc(50% - 4px); }
}
</style>
