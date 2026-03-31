import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function read(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('library folder view', () => {
  it('loads archive card styles from a dedicated stylesheet', () => {
    const source = read('src/views/LibraryFolderView.vue')

    expect(source).toMatch(/<style\s+scoped\s+src="\.\/LibraryFolderView\.css"><\/style>/)
  })

  it('adds archive-style folder framing', () => {
    const source = read('src/views/LibraryFolderView.vue')

    expect(source).toMatch(/library-folder-hero/)
    expect(source).toMatch(/library-folder-summary/)
  })

  it('assigns explicit visual states to embed-ready and download-only assets', () => {
    const source = read('src/views/LibraryFolderView.vue')

    expect(source).toMatch(/asset-card--embed/)
    expect(source).toMatch(/asset-card--download/)
    expect(source).toMatch(/asset-state-badge/)
    expect(source).toMatch(/\.asset-card--embed\s*\{/)
    expect(source).toMatch(/\.asset-card--download\s*\{/)
  })

  it('renders a single download action for download-only assets while keeping embed preview actions', () => {
    const source = read('src/views/LibraryFolderView.vue')
    expect(source).toMatch(/openMode\s*===\s*'embed'/)
    expect(source).toMatch(/打开演示/)
    expect(source).toMatch(
      /v-if="asset\.openMode === 'embed'"[\s\S]*target="_blank"[\s\S]*打开演示/
    )
    expect(source).toMatch(
      /v-else[\s\S]*:href="downloadAssetHref\(asset\)"[\s\S]*download[\s\S]*下载文件/
    )
    expect(source).toMatch(/仅下载/)
    expect(source).not.toMatch(/打开文件/)
    expect(source).toMatch(/asset\.displayName\s*\|\|\s*asset\.fileName/)
  })

  it('loads folder detail before requesting assets to avoid duplicate 404 noise', () => {
    const source = read('src/views/LibraryFolderView.vue')
    expect(source).toMatch(/const nextFolder = await getLibraryFolder\(folderId\)/)
    expect(source).toMatch(/const nextAssets = await listLibraryFolderAssets\(folderId\)/)
    expect(source).not.toMatch(
      /Promise\.all\(\s*\[\s*getLibraryFolder\(folderId\)\s*,\s*listLibraryFolderAssets\(folderId\)\s*\]/
    )
  })

  it('ignores stale reload responses after route changes', () => {
    const source = read('src/views/LibraryFolderView.vue')
    expect(source).toMatch(/const reloadSeq = ref\(0\)/)
    expect(source).toMatch(/const requestSeq = reloadSeq\.value \+ 1/)
    expect(source).toMatch(/reloadSeq\.value = requestSeq/)
    expect(source).toMatch(
      /if \(requestSeq !== reloadSeq\.value \|\| routeFolderId\(\) !== folderId\) return/
    )
  })

  it('updates the page title for direct-entry error states instead of leaving the default app title', () => {
    const source = read('src/views/LibraryFolderView.vue')
    expect(source).toMatch(/document\.title\s*=\s*['"]缺少文件夹参数 - 资源库['"]/)
    expect(source).toMatch(/document\.title\s*=\s*['"]加载文件夹失败 - 资源库['"]/)
  })

  it('keeps the visible page heading in sync with missing-parameter and load-failure states', () => {
    const source = read('src/views/LibraryFolderView.vue')
    expect(source).toMatch(/const pageHeading = ref\s*\(\s*['"]文件夹['"]\s*\)/)
    expect(source).toMatch(/pageHeading\.value\s*=\s*['"]缺少文件夹参数['"]/)
    expect(source).toMatch(/pageHeading\.value\s*=\s*['"]加载文件夹失败['"]/)
    expect(source).toMatch(/<h2>\{\{ pageHeading \}\}<\/h2>/)
  })

  it('wraps long unbroken asset names and metadata on narrow mobile cards', () => {
    const source = read('src/views/LibraryFolderView.vue')

    expect(source).toMatch(/\.asset-name\s*\{[\s\S]*overflow-wrap:\s*anywhere/)
    expect(source).toMatch(/\.asset-name\s*\{[\s\S]*word-break:\s*break-word/)
    expect(source).toMatch(/\.asset-meta\s*\{[\s\S]*overflow-wrap:\s*anywhere/)
    expect(source).toMatch(/\.asset-meta\s*\{[\s\S]*word-break:\s*break-word/)
  })

  it('wraps long folder heading text on mobile to avoid page-level horizontal overflow', () => {
    const source = read('src/views/LibraryFolderView.vue')

    expect(source).toMatch(/\.library-head h2\s*\{[\s\S]*min-width:\s*0/)
    expect(source).toMatch(/\.library-head h2\s*\{[\s\S]*overflow-wrap:\s*anywhere/)
    expect(source).toMatch(/\.library-head h2\s*\{[\s\S]*word-break:\s*break-word/)
  })

  it('falls back to the catalog library section for direct-entry back navigation', () => {
    const source = read('src/views/LibraryFolderView.vue')

    expect(source).toMatch(
      /void router\.replace\(\{\s*path:\s*['"]\/['"],\s*hash:\s*['"]#catalog-library['"]\s*\}\)/
    )
    expect(source).not.toMatch(/void router\.replace\(['"]\/['"]\)/)
  })

  it('no longer includes quick shortcut links in the folder view', () => {
    const source = read('src/views/LibraryFolderView.vue')

    expect(source).not.toMatch(/回到最近课堂入口/)
    expect(source).not.toMatch(/查看已固定演示/)
  })
})
