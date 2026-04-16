<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { setToken } from "../../features/auth/authApi";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { updateAccount } from "../../features/admin/adminApi";
import { usePendingChangesGuard } from "../../features/admin/composables/usePendingChangesGuard";
import { extractApiError } from "../../features/shared/apiError";
import { PAButton, PACard, PAField, PAInput, PAActions } from "@/components/ui/patterns";

const auth = useAuthStore();

const saving = ref(false);
const errorText = ref("");
const successText = ref("");
const fieldErrors = ref<Record<string, string>>({});

const currentPassword = ref("");
const newUsername = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

function setFieldError(key: string, message: string) {
  fieldErrors.value = {
    ...fieldErrors.value,
    [key]: message,
  };
}

function clearFieldErrors(key?: string) {
  if (!key) {
    fieldErrors.value = {};
    return;
  }
  if (!(key in fieldErrors.value)) return;
  const next = { ...fieldErrors.value };
  delete next[key];
  fieldErrors.value = next;
}

function getFieldError(key: string): string {
  return fieldErrors.value[key] || "";
}

function syncConfirmPasswordError() {
  if (!getFieldError("confirmPassword")) return;
  if (!newPassword.value || newPassword.value === confirmPassword.value) {
    clearFieldErrors("confirmPassword");
  }
}

watch([newPassword, confirmPassword], () => {
  syncConfirmPasswordError();
});

const hasPendingChanges = computed(() => Boolean(currentPassword.value || newUsername.value || newPassword.value || confirmPassword.value));

usePendingChangesGuard({
  hasPendingChanges,
  isBlocked: saving,
  message: "账号信息有未保存更改，确定离开当前页面吗？",
});

async function submit() {
  errorText.value = "";
  successText.value = "";
  clearFieldErrors();

  if (!currentPassword.value) {
    setFieldError("currentPassword", "请输入当前密码。");
    return;
  }
  if (newUsername.value && !newUsername.value.trim()) {
    setFieldError("newUsername", "新用户名不能只包含空白字符。");
    return;
  }
  if (newPassword.value && !newPassword.value.trim()) {
    setFieldError("newPassword", "新密码不能只包含空白字符。");
    return;
  }
  if (!newUsername.value.trim() && !newPassword.value.trim()) {
    setFieldError("newUsername", "请填写新用户名或新密码。");
    setFieldError("newPassword", "请填写新用户名或新密码。");
    return;
  }
  if (newPassword.value && newPassword.value !== confirmPassword.value) {
    setFieldError("confirmPassword", "两次密码不一致。");
    return;
  }

  saving.value = true;
  try {
    const data = await updateAccount({
      currentPassword: currentPassword.value,
      newUsername: newUsername.value.trim() || undefined,
      newPassword: newPassword.value || undefined,
    });

    if (typeof data?.token === "string") setToken(data.token);
    if (typeof data?.username === "string") {
      auth.username = data.username;
      auth.loggedIn = true;
    }
    currentPassword.value = "";
    newUsername.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    successText.value = "账号信息已更新。";
  } catch (err) {
    const e = extractApiError(err);
    if (e.status === 401 && e.data?.error === "invalid_credentials") {
      setFieldError("currentPassword", "当前密码错误。");
      return;
    }
    if (e.data?.error === "invalid_username") {
      setFieldError("newUsername", "新用户名不能只包含空白字符。");
      return;
    }
    if (e.data?.error === "invalid_password") {
      setFieldError("newPassword", "新密码不能只包含空白字符。");
      return;
    }
    if (e.data?.error === "no_changes") {
      setFieldError("newUsername", "请填写新用户名或新密码。");
      setFieldError("newPassword", "请填写新用户名或新密码。");
      return;
    }
    errorText.value = e.status === 401 ? "请先登录管理员账号。" : "更新账号失败。";
  } finally {
    saving.value = false;
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
        <strong>{{ auth.username || "未命名管理员" }}</strong>
      </div>
    </header>
    <div v-if="errorText" class="error-text admin-feedback error">{{ errorText }}</div>
    <div v-if="successText" class="success-text admin-feedback success">{{ successText }}</div>

    <PACard variant="admin" class="max-w-[480px]" as="form" @submit.prevent="submit">
      <div class="current-user">
        当前登录用户：<strong>{{ auth.username || "-" }}</strong>
      </div>

      <PAField :error="getFieldError('currentPassword')">
        <template #label>当前密码</template>
        <PAInput
          v-model="currentPassword"
          name="current_password"
          type="password"
          autocomplete="current-password"
          :state="getFieldError('currentPassword') ? 'error' : 'default'"
          :disabled="saving"
          @input="clearFieldErrors('currentPassword')"
        />
      </PAField>

      <PAField :error="getFieldError('newUsername')">
        <template #label>新用户名（可选）</template>
        <PAInput
          v-model="newUsername"
          name="username"
          autocomplete="username"
          :state="getFieldError('newUsername') ? 'error' : 'default'"
          :disabled="saving"
          @input="clearFieldErrors('newUsername')"
        />
      </PAField>

      <PAField :error="getFieldError('newPassword')">
        <template #label>新密码（可选）</template>
        <PAInput
          v-model="newPassword"
          name="new_password"
          type="password"
          autocomplete="new-password"
          :state="getFieldError('newPassword') ? 'error' : 'default'"
          :disabled="saving"
          @input="clearFieldErrors('newPassword')"
        />
      </PAField>

      <PAField :error="getFieldError('confirmPassword')">
        <template #label>确认新密码</template>
        <PAInput
          v-model="confirmPassword"
          name="confirm_new_password"
          type="password"
          autocomplete="new-password"
          :state="getFieldError('confirmPassword') ? 'error' : 'default'"
          :disabled="saving"
          @input="clearFieldErrors('confirmPassword')"
        />
      </PAField>

      <PAActions align="end">
        <PAButton type="submit" :disabled="saving">保存</PAButton>
      </PAActions>
    </PACard>
  </section>
</template>

<style scoped>
.admin-account-view {
  display: grid;
  gap: 12px;
}



.current-user {
  color: var(--muted);
  font-size: calc(14px * var(--ui-scale));
}
</style>
