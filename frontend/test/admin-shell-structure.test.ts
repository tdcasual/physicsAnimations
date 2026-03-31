import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function readFile(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('admin shell structure', () => {
  it('moves grouped admin navigation config and layout styles into dedicated modules', () => {
    const source = readFile('src/views/admin/AdminLayoutView.vue')

    expect(source).toMatch(/features\/admin\/adminNavConfig/)
    expect(source).toMatch(/<style\s+src="\.\/AdminLayoutView\.css"><\/style>/)
  })

  it('organizes admin modules into grouped workspace navigation', () => {
    const source = [
      readFile('src/views/admin/AdminLayoutView.vue'),
      readFile('src/components/admin/AdminShellHeader.vue'),
      readFile('src/features/admin/adminNavConfig.ts'),
    ].join('\n')

    expect(source).toMatch(/admin-nav-group/)
    expect(source).toMatch(/内容管理|资源结构|系统设置/)
  })

  it('adds current workspace context and a controlled mobile workspace menu', () => {
    const source = [
      readFile('src/views/admin/AdminLayoutView.vue'),
      readFile('src/components/admin/AdminShellHeader.vue'),
      readFile('src/features/admin/adminNavConfig.ts'),
    ].join('\n')

    expect(source).toMatch(/mobileNavOpen/)
    expect(source).toMatch(/class="admin-mobile-nav-strip"/)
    expect(source).toMatch(/class="admin-mobile-nav-links"/)
    expect(source).toMatch(/currentAdminGroup\.items/)
    expect(source).toMatch(/class="admin-nav-sheet-heading"/)
    expect(source).toMatch(/class="admin-mobile-nav-trigger"/)
    expect(source).toMatch(/admin-nav-shell/)
    expect(source).toMatch(/class="admin-shell-header admin-shell-header--compact"/)
    expect(source).toMatch(/class="admin-shell-mobile-context"/)
    expect(source).toMatch(/切换模块/)
  })

  it('applies denser shell hooks and group-specific workspace tone classes', () => {
    const source = [
      readFile('src/views/admin/AdminLayoutView.vue'),
      readFile('src/components/admin/AdminShellHeader.vue'),
    ].join('\n')

    expect(source).toMatch(/admin-layout-view--workspace/)
    expect(source).toMatch(/admin-layout-view--library/)
    expect(source).toMatch(/admin-layout-view--system/)
    expect(source).toMatch(/admin-shell-header--dense/)
    expect(source).toMatch(/admin-shell-ops/)
    expect(source).toMatch(/admin-shell-pulse/)
    expect(source).not.toMatch(/admin-context-card--compact/)
  })

  it('keeps operational status framing in the shell header instead of repeating a second workspace card', () => {
    const source = [
      readFile('src/views/admin/AdminLayoutView.vue'),
      readFile('src/components/admin/AdminShellHeader.vue'),
    ].join('\n')
    const descriptionMatches = source.match(/currentAdminSection\.description/g) ?? []

    expect(source).toMatch(/admin-shell-status-strip/)
    expect(source).toMatch(/admin-shell-status-copy/)
    expect(source).toMatch(/admin-nav-group-summary/)
    expect(source).toMatch(/admin-mobile-nav-group/)
    expect(source).not.toMatch(/admin-context-card--active/)
    expect(source).not.toMatch(/admin-context-chip--count/)
    expect(descriptionMatches.length).toBeLessThanOrEqual(1)
  })

  it('extracts the shell header into a dedicated admin component', () => {
    const source = readFile('src/views/admin/AdminLayoutView.vue')

    expect(source).toMatch(/import AdminShellHeader/)
    expect(source).toMatch(/<AdminShellHeader/)
    expect(source).not.toMatch(/class="admin-shell-header admin-shell-header--compact"/)
  })

  it('treats the mobile shell header as a contextual admin app bar instead of repeating desktop framing', () => {
    const source = [
      readFile('src/components/admin/AdminShellHeader.vue'),
      readFile('src/views/admin/AdminLayoutView.css'),
    ].join('\n')

    // 手机端样式在640px断点
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-mobile-context\s*\{[\s\S]*display:\s*inline-flex/
    )
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-summary-row\s*\{[\s\S]*display:\s*none/
    )
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-header\s*\{[\s\S]*border:\s*0[\s\S]*padding:\s*2px\s*2px\s*0/
    )
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-title\s*\{[\s\S]*font-size:\s*clamp\(1\.18rem,\s*5\.4vw,\s*1\.44rem\)/
    )
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-status-strip\s*\{[\s\S]*display:\s*none/
    )
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-mobile-nav-strip\s*\{[\s\S]*display:\s*grid[\s\S]*position:\s*sticky/
    )
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-mobile-nav-links\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    )
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-mobile-nav-link-copy\s*\{[\s\S]*display:\s*none/
    )
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-nav-bar\s*\{[\s\S]*position:\s*fixed[\s\S]*bottom:/
    )
  })

  it('reframes library and taxonomy mobile views as progressive-disclosure task flows', () => {
    const library = [
      readFile('src/views/admin/AdminLibraryView.vue'),
      readFile('src/views/admin/library/AdminLibraryView.template.html'),
      readFile('src/views/admin/library/AdminLibraryView.css'),
    ].join('\n')
    const taxonomy = [
      readFile('src/views/admin/AdminTaxonomyView.vue'),
      readFile('src/views/admin/taxonomy/TaxonomyTreePanel.vue'),
      readFile('src/views/admin/taxonomy/GroupEditorPanel.vue'),
      readFile('src/views/admin/taxonomy/CategoryEditorPanel.vue'),
    ].join('\n')

    expect(library).toMatch(/library-mobile-taskbar/)
    expect(library).toMatch(/library-mobile-primary-actions/)
    expect(library).toMatch(/library-mobile-sheet/)
    expect(library).toMatch(/openMobileLibrarySheet/)
    expect(library).toMatch(/closeMobileLibrarySheet/)

    expect(taxonomy).toMatch(/taxonomy-mobile-actions/)
    expect(taxonomy).toMatch(/taxonomy-editor-sheet/)
    expect(taxonomy).toMatch(/taxonomy-editor-sheet-backdrop/)
    expect(taxonomy).toMatch(/openCreateGroupSheet/)
    expect(taxonomy).toMatch(/closeMobileEditorSheet/)
  })
})
