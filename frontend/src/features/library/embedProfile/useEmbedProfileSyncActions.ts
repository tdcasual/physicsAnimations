import { deleteLibraryEmbedProfile, syncLibraryEmbedProfile } from '../libraryApi'
import type { UseLibraryEmbedProfileActionsDeps } from './embedProfileActionDeps'

interface UseEmbedProfileSyncActionsArgs {
  deps: UseLibraryEmbedProfileActionsDeps
  reloadEmbedProfiles: () => Promise<void>
}

export function useEmbedProfileSyncActions({
  deps,
  reloadEmbedProfiles,
}: UseEmbedProfileSyncActionsArgs) {
  async function removeEmbedProfile(profileId: string) {
    if (!window.confirm('确定删除该 Embed 平台吗？')) return

    deps.savingEmbed.value = true
    deps.setFeedback('')
    try {
      await deleteLibraryEmbedProfile(profileId)
      await reloadEmbedProfiles()
      deps.setActivePanelTab('embed')
      deps.setFeedback('Embed 平台已删除。')
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } }
      if (e?.status === 401) {
        deps.setFeedback('请先登录管理员账号。', true)
        return
      }
      if (e?.data?.error === 'embed_profile_in_use') {
        deps.setFeedback('该 Embed 平台仍被资源引用，无法删除。', true)
        return
      }
      deps.setFeedback('删除 Embed 平台失败。', true)
    } finally {
      deps.savingEmbed.value = false
    }
  }

  async function syncEmbedProfileEntry(profileId: string) {
    deps.savingEmbed.value = true
    deps.setFeedback('')
    try {
      await syncLibraryEmbedProfile(profileId)
      await reloadEmbedProfiles()
      deps.setActivePanelTab('embed')
      deps.setFeedback('Embed 平台已同步到本地。')
    } catch (err) {
      const e = err as { status?: number; data?: { error?: string } }
      if (e?.status === 401) {
        deps.setFeedback('请先登录管理员账号。', true)
        return
      }
      if (e?.data?.error === 'embed_profile_sync_failed') {
        deps.setFeedback('同步失败，请检查远端脚本/Viewer 是否可访问。', true)
        return
      }
      deps.setFeedback('同步 Embed 平台失败。', true)
    } finally {
      deps.savingEmbed.value = false
    }
  }

  return {
    removeEmbedProfile,
    syncEmbedProfileEntry,
  }
}
