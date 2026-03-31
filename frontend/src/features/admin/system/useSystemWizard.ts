import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { canRunManualSync, isRemoteMode, shouldRequireWebdavUrl } from '../systemFormState'
import { useFieldErrors } from '../composables/useFieldErrors'
import { createSystemWizardActions } from './useSystemWizardActions'
import { createSystemWizardBindings, formatSystemDate } from './useSystemWizardBindings'
import type { SystemEmbedUpdater, SystemStorage, WizardStep } from './systemWizardTypes'

export type { SystemEmbedUpdater, SystemStorage } from './systemWizardTypes'

export function useSystemWizard() {
  const steps: Array<{ id: WizardStep; title: string; hint: string }> = [
    { id: 1, title: '1. 选择模式', hint: '决定存储架构' },
    { id: 2, title: '2. 连接配置', hint: '填写本地或 WebDAV 信息' },
    { id: 3, title: '3. 校验与保存', hint: '验证连接并保存配置' },
    { id: 4, title: '4. 启用同步', hint: '执行首次同步并检查状态' },
  ]

  const loading = ref(false)
  const saving = ref(false)
  const validating = ref(false)
  const syncing = ref(false)
  const savingEmbedUpdater = ref(false)

  const errorText = ref('')
  const successText = ref('')
  const validateText = ref('')
  const validateOk = ref(false)
  const embedUpdaterErrorText = ref('')
  const embedUpdaterSuccessText = ref('')
  const { fieldErrors, setFieldError, clearFieldErrors, getFieldError } = useFieldErrors()

  const storage = ref<SystemStorage | null>(null)
  const embedUpdater = ref<SystemEmbedUpdater | null>(null)
  const wizardStep = ref<WizardStep>(1)

  const mode = ref('local')
  const url = ref('')
  const basePath = ref('physicsAnimations')
  const username = ref('')
  const password = ref('')
  const timeoutMs = ref(15000)
  const scanRemote = ref(false)
  const embedUpdaterEnabled = ref(true)
  const embedUpdaterIntervalDays = ref(20)

  const loadedStorageSnapshot = ref('')
  const loadedEmbedUpdaterSnapshot = ref('')

  const { buildStorageSnapshot, buildEmbedUpdaterSnapshot, applyStorage, applyEmbedUpdater } =
    createSystemWizardBindings({
      storage,
      embedUpdater,
      wizardStep,
      mode,
      url,
      basePath,
      username,
      password,
      timeoutMs,
      scanRemote,
      validateText,
      validateOk,
      embedUpdaterEnabled,
      embedUpdaterIntervalDays,
      loadedStorageSnapshot,
      loadedEmbedUpdaterSnapshot,
      clearFieldErrors,
    })

  const remoteMode = computed(() => isRemoteMode(mode.value))
  const requiresWebdavUrl = computed(() => shouldRequireWebdavUrl(mode.value))
  const readOnlyMode = computed(() => storage.value?.readOnly === true)
  const wizardBusy = computed(
    () => loading.value || saving.value || validating.value || syncing.value
  )

  const hasStorageUnsavedChanges = computed(
    () => buildStorageSnapshot() !== loadedStorageSnapshot.value
  )
  const hasEmbedUpdaterUnsavedChanges = computed(
    () => buildEmbedUpdaterSnapshot() !== loadedEmbedUpdaterSnapshot.value
  )
  const hasUnsavedChanges = computed(
    () => hasStorageUnsavedChanges.value || hasEmbedUpdaterUnsavedChanges.value
  )

  const canSyncNow = computed(
    () =>
      canRunManualSync({ mode: mode.value, url: url.value }) &&
      !hasStorageUnsavedChanges.value &&
      !readOnlyMode.value
  )

  const syncHint = computed(() => {
    if (readOnlyMode.value) return '当前为只读模式，无法执行同步。'
    if (!remoteMode.value) return 'local 模式不执行 WebDAV 同步。'
    if (!String(url.value || '').trim()) return '请先填写 WebDAV URL。'
    return hasStorageUnsavedChanges.value ? '存在未保存改动，请先保存配置。' : ''
  })

  const saveDisabledHint = computed(() => {
    if (wizardStep.value !== 3) return ''
    return saving.value ? '正在保存配置，请稍候。' : readOnlyMode.value ? '当前为只读模式，无法保存配置。' : ''
  })
  const continueDisabledHint = computed(() => wizardStep.value !== 3 ? '' : hasStorageUnsavedChanges.value ? '请先保存配置后再继续下一步。' : '')
  const embedUpdaterSaveHint = computed(() => {
    if (savingEmbedUpdater.value) return '正在保存自动更新设置，请稍候。'
    const days = Number(embedUpdaterIntervalDays.value)
    return !Number.isFinite(days) || !Number.isInteger(days) || days < 1 || days > 365 ? '更新周期需为 1-365 天的整数。' : ''
  })

  function onModeChanged() {
    if (wizardBusy.value) return
    successText.value = ''
    validateText.value = ''
    validateOk.value = false
    if (!shouldRequireWebdavUrl(mode.value)) {
      clearFieldErrors('webdavUrl')
    }
    if (wizardStep.value > 2) wizardStep.value = 2
  }

  function canNavigateToStep(step: WizardStep) {
    if (wizardBusy.value) return false
    if (step <= wizardStep.value) return true
    if (wizardStep.value === 2 && requiresWebdavUrl.value && !String(url.value || '').trim()) {
      setFieldError('webdavUrl', '请填写 WebDAV 地址。')
      errorText.value = '请填写 WebDAV 地址。'
      return false
    }
    if (wizardStep.value === 3 && hasStorageUnsavedChanges.value) return false
    return true
  }

  function goStep(step: WizardStep) {
    if (!canNavigateToStep(step)) return
    if (step <= wizardStep.value) {
      wizardStep.value = step
      return
    }
    if (wizardStep.value === 1) {
      wizardStep.value = remoteMode.value ? 2 : 3
      return
    }
    if (wizardStep.value === 2) {
      clearFieldErrors('webdavUrl')
      wizardStep.value = 3
      return
    }
    if (wizardStep.value === 3) {
      wizardStep.value = 4
      return
    }
    wizardStep.value = step
  }

  function nextFromMode() {
    if (wizardBusy.value) return
    errorText.value = ''
    wizardStep.value = remoteMode.value ? 2 : 3
  }

  function nextFromConnection() {
    if (wizardBusy.value) return
    errorText.value = ''
    if (requiresWebdavUrl.value && !String(url.value || '').trim()) {
      setFieldError('webdavUrl', '请填写 WebDAV 地址。')
      errorText.value = '请填写 WebDAV 地址。'
      return
    }
    clearFieldErrors('webdavUrl')
    wizardStep.value = 3
  }

  const { loadSystem, runValidation, saveStorage, saveEmbedUpdater, syncNow } =
    createSystemWizardActions({
      loading,
      saving,
      validating,
      syncing,
      savingEmbedUpdater,
      errorText,
      successText,
      validateText,
      validateOk,
      embedUpdaterErrorText,
      embedUpdaterSuccessText,
      wizardStep,
      mode,
      url,
      basePath,
      username,
      password,
      timeoutMs,
      scanRemote,
      embedUpdaterEnabled,
      embedUpdaterIntervalDays,
      remoteMode,
      requiresWebdavUrl,
      readOnlyMode,
      canSyncNow,
      setFieldError,
      clearFieldErrors,
      applyStorage,
      applyEmbedUpdater,
    })

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsavedChanges.value || saving.value || syncing.value || savingEmbedUpdater.value)
      return
    event.preventDefault()
    event.returnValue = ''
  }

  onBeforeRouteLeave(() => {
    if (!hasUnsavedChanges.value || saving.value || syncing.value || savingEmbedUpdater.value)
      return true
    return window.confirm('系统设置有未保存更改，确定离开当前页面吗？')
  })

  onMounted(async () => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    await loadSystem({ resetStep: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  return {
    steps,
    loading,
    saving,
    validating,
    syncing,
    savingEmbedUpdater,
    errorText,
    successText,
    validateText,
    validateOk,
    embedUpdaterErrorText,
    embedUpdaterSuccessText,
    fieldErrors,
    getFieldError,
    clearFieldErrors,
    storage,
    embedUpdater,
    wizardStep,
    mode,
    url,
    basePath,
    username,
    password,
    timeoutMs,
    scanRemote,
    embedUpdaterEnabled,
    embedUpdaterIntervalDays,
    remoteMode,
    requiresWebdavUrl,
    readOnlyMode,
    canSyncNow,
    syncHint,
    hasStorageUnsavedChanges,
    hasEmbedUpdaterUnsavedChanges,
    hasUnsavedChanges,
    saveDisabledHint,
    continueDisabledHint,
    embedUpdaterSaveHint,
    formatDate: formatSystemDate,
    onModeChanged,
    goStep,
    nextFromMode,
    nextFromConnection,
    runValidation,
    saveStorage,
    saveEmbedUpdater,
    syncNow,
  }
}
