import { updateLibraryEmbedProfile } from '../libraryApi'
import type { LibraryEmbedProfile } from '../types'
import type { UseLibraryEmbedProfileActionsDeps } from './embedProfileActionDeps'

interface UseEmbedProfileEditActionsArgs {
  deps: UseLibraryEmbedProfileActionsDeps
  reloadEmbedProfiles: () => Promise<void>
  cancelEmbedProfileEdit: () => void
}

export function useEmbedProfileEditActions({
  deps,
  reloadEmbedProfiles,
  cancelEmbedProfileEdit,
}: UseEmbedProfileEditActionsArgs) {
  function startEditEmbedProfile(profile: LibraryEmbedProfile) {
    deps.setActivePanelTab('embed')
    deps.ensurePanelSectionOpen('embed:edit')
    deps.editingEmbedProfileId.value = profile.id
    deps.embedEditName.value = profile.name || ''
    deps.embedEditScriptUrl.value = profile.remoteScriptUrl || profile.scriptUrl || ''
    deps.embedEditFallbackScriptUrl.value = profile.fallbackScriptUrl || ''
    deps.embedEditViewerPath.value = profile.remoteViewerPath || profile.viewerPath || ''
    deps.embedEditConstructorName.value = profile.constructorName || 'ElectricFieldApp'
    deps.embedEditAssetUrlOptionKey.value = profile.assetUrlOptionKey || 'sceneUrl'
    deps.embedEditExtensionsText.value = Array.isArray(profile.matchExtensions)
      ? profile.matchExtensions.join(',')
      : ''
    deps.embedEditDefaultOptionsJson.value = JSON.stringify(profile.defaultOptions || {}, null, 2)
    deps.embedEditEnabled.value = profile.enabled !== false
  }

  async function saveEmbedProfileEdit() {
    deps.clearFieldErrors(
      'editEmbedProfileName',
      'editEmbedScriptUrl',
      'editEmbedDefaultOptionsJson'
    )
    if (!deps.editingEmbedProfileId.value) return

    const name = deps.embedEditName.value.trim()
    const scriptUrl = deps.embedEditScriptUrl.value.trim()
    if (!name) {
      deps.setFieldError('editEmbedProfileName', '请填写 Embed 平台名称。')
      deps.setFeedback('请填写 Embed 平台名称。', true)
      return
    }
    if (!scriptUrl) {
      deps.setFieldError('editEmbedScriptUrl', '请填写 embed.js 地址。')
      deps.setFeedback('请填写 embed.js 地址。', true)
      return
    }

    const parsedDefaults = deps.parseJsonObjectInput(
      deps.embedEditDefaultOptionsJson.value,
      '默认参数 JSON',
      'editEmbedDefaultOptionsJson'
    )
    if (!parsedDefaults.ok) return

    const matchExtensions = deps.embedEditExtensionsText.value
      .split(',')
      .map(item => item.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean)

    deps.savingEmbed.value = true
    deps.setFeedback('')
    try {
      await updateLibraryEmbedProfile(deps.editingEmbedProfileId.value, {
        name,
        scriptUrl,
        fallbackScriptUrl: deps.embedEditFallbackScriptUrl.value.trim(),
        viewerPath: deps.embedEditViewerPath.value.trim(),
        constructorName: deps.embedEditConstructorName.value.trim() || 'ElectricFieldApp',
        assetUrlOptionKey: deps.embedEditAssetUrlOptionKey.value.trim() || 'sceneUrl',
        matchExtensions,
        defaultOptions: parsedDefaults.value,
        enabled: deps.embedEditEnabled.value,
      })
      await reloadEmbedProfiles()
      deps.setActivePanelTab('embed')
      deps.setFeedback('Embed 平台已更新。')
      cancelEmbedProfileEdit()
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
      deps.setFeedback('更新 Embed 平台失败。', true)
    } finally {
      deps.savingEmbed.value = false
    }
  }

  return {
    startEditEmbedProfile,
    saveEmbedProfileEdit,
  }
}
