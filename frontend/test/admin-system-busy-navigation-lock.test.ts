import { beforeEach, describe, expect, it } from 'vitest'
import SystemWizardSteps from '../src/views/admin/system/SystemWizardSteps.vue'
import { mountVueComponent } from './helpers/mountVueComponent'
import { mountSystemWizardHarness, resetSystemWizardApiMocks } from './helpers/systemWizardHarness'

describe('admin system busy navigation lock', () => {
  beforeEach(() => {
    resetSystemWizardApiMocks()
  })

  it('blocks wizard step navigation helpers while save/validate/sync is in flight', async () => {
    const harness = await mountSystemWizardHarness()

    harness.wizard.saving.value = true
    harness.wizard.mode.value = 'webdav'
    harness.wizard.nextFromMode()
    expect(harness.wizard.wizardStep.value).toBe(1)

    expect(harness.wizard.goStep(2)).toBeUndefined()
    expect(harness.wizard.wizardStep.value).toBe(1)

    harness.wizard.saving.value = false
    harness.wizard.nextFromMode()
    expect(harness.wizard.wizardStep.value).toBe(2)

    harness.cleanup()
  })

  it('disables step switching and back/reconfigure buttons while the wizard is busy', async () => {
    const mounted = await mountVueComponent(SystemWizardSteps, {
      steps: [
        { id: 1, title: '1. 选择模式', hint: '决定存储架构' },
        { id: 2, title: '2. 连接配置', hint: '填写本地或 WebDAV 信息' },
        { id: 3, title: '3. 校验与保存', hint: '验证连接并保存配置' },
        { id: 4, title: '4. 启用同步', hint: '执行首次同步并检查状态' },
      ],
      wizardStep: 1,
      loading: false,
      mode: 'local',
      url: '',
      basePath: 'physicsAnimations',
      username: '',
      password: '',
      timeoutMs: 15000,
      scanRemote: false,
      remoteMode: false,
      readOnlyMode: false,
      validating: false,
      saving: true,
      syncing: false,
      validateText: '',
      validateOk: false,
      hasUnsavedChanges: false,
      saveDisabledHint: '',
      continueDisabledHint: '',
      syncHint: '',
      canSyncNow: false,
      getFieldError: () => '',
      clearFieldErrors: () => {},
    })

    expect(
      Array.from(mounted.host.querySelectorAll('.step-button')).every(
        node => (node as HTMLButtonElement).disabled
      )
    ).toBe(true)
    expect(
      Array.from(mounted.host.querySelectorAll('input[type="radio"]')).every(
        node => (node as HTMLInputElement).disabled
      )
    ).toBe(true)
    expect((mounted.host.querySelector('.btn.btn-primary') as HTMLButtonElement).disabled).toBe(
      true
    )

    mounted.cleanup()
  })
})
