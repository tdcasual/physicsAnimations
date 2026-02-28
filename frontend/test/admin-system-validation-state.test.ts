import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { createSystemWizardActions } from "../src/features/admin/system/useSystemWizardActions";

describe("admin system validation state", () => {
  it("clears stale validation message when url is missing", async () => {
    const loading = ref(false);
    const saving = ref(false);
    const validating = ref(false);
    const syncing = ref(false);
    const errorText = ref("");
    const successText = ref("");
    const validateText = ref("连接校验通过。");
    const validateOk = ref(true);
    const wizardStep = ref<1 | 2 | 3 | 4>(2);
    const mode = ref("webdav");
    const url = ref("");
    const basePath = ref("physicsAnimations");
    const username = ref("");
    const password = ref("");
    const timeoutMs = ref(15000);
    const scanRemote = ref(false);
    const remoteMode = computed(() => true);
    const requiresWebdavUrl = computed(() => true);
    const readOnlyMode = computed(() => false);
    const canSyncNow = computed(() => false);

    const actions = createSystemWizardActions({
      loading,
      saving,
      validating,
      syncing,
      errorText,
      successText,
      validateText,
      validateOk,
      wizardStep,
      mode,
      url,
      basePath,
      username,
      password,
      timeoutMs,
      scanRemote,
      remoteMode,
      requiresWebdavUrl,
      readOnlyMode,
      canSyncNow,
      setFieldError: () => {},
      clearFieldErrors: () => {},
      applyStorage: () => {},
    });

    await actions.runValidation();

    expect(validateText.value).toBe("");
    expect(validateOk.value).toBe(false);
    expect(errorText.value).toBe("请填写 WebDAV 地址。");
  });
});
