import { beforeEach, describe, expect, it, vi } from 'vitest'
import SystemWizardSteps from '../src/views/admin/system/SystemWizardSteps.vue'
import { mountVueComponent } from './helpers/mountVueComponent'
import { mountSystemWizardHarness, resetSystemWizardApiMocks } from './helpers/systemWizardHarness'

describe('admin system step navigation guard', () => {
  beforeEach(() => {
    resetSystemWizardApiMocks()
  })

  it('routes forward step-button navigation through the same guardrails as the primary next actions', async () => {
    const harness = await mountSystemWizardHarness()

    harness.wizard.mode.value = 'webdav'
    harness.wizard.nextFromMode()
    expect(harness.wizard.wizardStep.value).toBe(2)

    harness.wizard.goStep(3)
    expect(harness.wizard.wizardStep.value).toBe(2)
    expect(harness.wizard.errorText.value).toBe('请填写 WebDAV 地址。')

    harness.wizard.url.value = 'https://dav.example.com'
    harness.wizard.goStep(3)
    expect(harness.wizard.wizardStep.value).toBe(3)

    harness.wizard.goStep(4)
    expect(harness.wizard.wizardStep.value).toBe(3)

    const onStepClick = vi.fn()
    const onGoStep = vi.fn()
    const steps = await mountVueComponent(SystemWizardSteps, {
      steps: harness.wizard.steps,
      wizardStep: 3,
      loading: false,
      mode: 'webdav',
      url: 'https://dav.example.com',
      basePath: 'physicsAnimations',
      username: '',
      password: '',
      timeoutMs: 15000,
      scanRemote: false,
      remoteMode: true,
      readOnlyMode: false,
      validating: false,
      saving: false,
      syncing: false,
      validateText: '',
      validateOk: false,
      hasUnsavedChanges: true,
      saveDisabledHint: '',
      continueDisabledHint: '请先保存配置后再继续下一步。',
      syncHint: '',
      canSyncNow: false,
      getFieldError: () => '',
      clearFieldErrors: () => {},
      onStepClick,
      onGoStep,
    })

    ;(steps.host.querySelector('.step-button') as HTMLButtonElement).click()
    expect(onStepClick).toHaveBeenCalled()
    expect(onGoStep).not.toHaveBeenCalled()

    steps.cleanup()
    harness.cleanup()
  })
})
