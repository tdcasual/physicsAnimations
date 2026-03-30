import type { Ref } from 'vue'
import type { JsonObjectParseResult, LibraryPanelTab } from '../libraryAdminModels'
import type { LibraryEmbedProfile } from '../types'

export type ParserMode = 'auto' | 'profile'

export interface UseLibraryEmbedProfileActionsDeps {
  savingEmbed: Ref<boolean>
  embedProfiles: Ref<LibraryEmbedProfile[]>

  assetEmbedProfileId: Ref<string>
  assetEditParserMode: Ref<ParserMode>
  assetEditEmbedProfileId: Ref<string>

  embedProfileName: Ref<string>
  embedScriptUrl: Ref<string>
  embedFallbackScriptUrl: Ref<string>
  embedViewerPath: Ref<string>
  embedConstructorName: Ref<string>
  embedAssetUrlOptionKey: Ref<string>
  embedExtensionsText: Ref<string>
  embedDefaultOptionsJson: Ref<string>
  embedEnabled: Ref<boolean>

  editingEmbedProfileId: Ref<string>
  embedEditName: Ref<string>
  embedEditScriptUrl: Ref<string>
  embedEditFallbackScriptUrl: Ref<string>
  embedEditViewerPath: Ref<string>
  embedEditConstructorName: Ref<string>
  embedEditAssetUrlOptionKey: Ref<string>
  embedEditExtensionsText: Ref<string>
  embedEditDefaultOptionsJson: Ref<string>
  embedEditEnabled: Ref<boolean>

  setFeedback: (text: string, isError?: boolean) => void
  setFieldError: (fieldKey: string, text: string) => void
  clearFieldErrors: (...fieldKeys: string[]) => void
  setActivePanelTab: (tab: LibraryPanelTab) => void
  ensurePanelSectionOpen: (key: string) => void
  parseJsonObjectInput: (
    raw: string,
    fieldLabel: string,
    fieldKey?: string
  ) => JsonObjectParseResult
}
