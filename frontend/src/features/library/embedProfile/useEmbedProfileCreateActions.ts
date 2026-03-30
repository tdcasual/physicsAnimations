import { createLibraryEmbedProfile } from '../libraryApi'
import type { UseLibraryEmbedProfileActionsDeps } from './embedProfileActionDeps'

interface UseEmbedProfileCreateActionsArgs {
  deps: UseLibraryEmbedProfileActionsDeps
  reloadEmbedProfiles: () => Promise<void>
}

export function useEmbedProfileCreateActions({
  deps,
  reloadEmbedProfiles,
}: UseEmbedProfileCreateActionsArgs) {
  async function createEmbedProfileEntry() {
    deps.clearFieldErrors(
      'createEmbedProfileName',
      'createEmbedScriptUrl',
      'createEmbedDefaultOptionsJson'
    )
    const name = deps.embedProfileName.value.trim()
    const scriptUrl = deps.embedScriptUrl.value.trim()
    if (!name) {
      deps.setFieldError('createEmbedProfileName', '请填写 Embed 平台名称。')
      deps.setFeedback('请填写 Embed 平台名称。', true)
      return
    }
    if (!scriptUrl) {
      deps.setFieldError('createEmbedScriptUrl', '请填写 embed.js 地址。')
      deps.setFeedback('请填写 embed.js 地址。', true)
      return
    }

    const parsedDefaults = deps.parseJsonObjectInput(
      deps.embedDefaultOptionsJson.value,
      '默认参数 JSON',
      'createEmbedDefaultOptionsJson'
    )
    if (!parsedDefaults.ok) return

    const matchExtensions = deps.embedExtensionsText.value
      .split(',')
      .map(item => item.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean)

    deps.savingEmbed.value = true
    deps.setFeedback('')
    try {
      await createLibraryEmbedProfile({
        name,
        scriptUrl,
        fallbackScriptUrl: deps.embedFallbackScriptUrl.value.trim(),
        viewerPath: deps.embedViewerPath.value.trim(),
        constructorName: deps.embedConstructorName.value.trim() || 'ElectricFieldApp',
        assetUrlOptionKey: deps.embedAssetUrlOptionKey.value.trim() || 'sceneUrl',
        matchExtensions,
        defaultOptions: parsedDefaults.value,
        enabled: deps.embedEnabled.value,
      })
      deps.embedProfileName.value = ''
      deps.embedScriptUrl.value = ''
      deps.embedFallbackScriptUrl.value = ''
      deps.embedViewerPath.value = ''
      deps.embedConstructorName.value = 'ElectricFieldApp'
      deps.embedAssetUrlOptionKey.value = 'sceneUrl'
      deps.embedExtensionsText.value = ''
      deps.embedDefaultOptionsJson.value = '{}'
      deps.embedEnabled.value = true
      deps.clearFieldErrors(
        'createEmbedProfileName',
        'createEmbedScriptUrl',
        'createEmbedDefaultOptionsJson'
      )
      await reloadEmbedProfiles()
      deps.setActivePanelTab('embed')
      deps.setFeedback('Embed 平台已创建。')
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } }
      if (e?.status === 401) {
        deps.setFeedback('请先登录管理员账号。', true)
        return
      }
      if (e?.data?.error === 'invalid_profile_script_url') {
        deps.setFeedback('embed.js 地址无效。请使用 / 开头或 http(s) 地址。', true)
        return
      }
      if (e?.data?.error === 'invalid_profile_viewer_path') {
        deps.setFeedback('viewerPath 无效。', true)
        return
      }
      deps.setFeedback('创建 Embed 平台失败。', true)
    } finally {
      deps.savingEmbed.value = false
    }
  }

  return {
    createEmbedProfileEntry,
  }
}
