# Admin Area Modernization — Design Spec

## Goal

Eliminate duplicated code, simplify the library view's 543-line template, unify form/panel styling, and improve bundle efficiency across the admin area.

## Approach

Bottom-up rebuild: build a shared component library first, then rewrite views using it.

---

## 1. Shared Style Unification

### 1.1 Promote scoped classes to `admin-base.css`

Classes currently redefined in 6+ scoped style blocks become global:

| Class | Purpose | Replaces |
|-------|---------|----------|
| `.field` / `.field-input` / `.field-textarea` | Form field container + input | `.admin-field` / `.admin-input` (mixed usage) |
| `.form-grid` | Multi-column form layout | Scoped `.form-grid` in 5 files |
| `.checkbox` | Checkbox row | Scoped `.checkbox` in 4 files |
| `.meta` / `.meta-line` | Metadata text | Scoped `.meta` / `.meta-line` in 6 files |
| `.empty` | Empty state placeholder | Scoped `.empty` in 7 files |
| `.action-feedback` | Merged into `.admin-feedback` | Scoped `.action-feedback` in 4 files |

### 1.2 Remove `.panel` class

All usages of scoped `.panel` replaced with `.admin-card` (already exists, identical styling).

### 1.3 Unify field class naming

Standardize on `.field` / `.field-input` everywhere. Remove `.admin-field` / `.admin-input` aliases from `admin-base.css` after migrating SystemEmbedUpdaterPanel.

---

## 2. Shared Components

### 2.1 `AdminItemListPanel.vue`

Merges `ContentListPanel.vue` and `UploadsListPanel.vue`.

**Props:**
- `items: AdminItemRow[]`
- `totalCount: number`
- `hasMore: boolean`
- `searchQuery: string`
- `selectedId: string | null`
- `heading: string`
- `searchPlaceholder: string`
- `emptyText: string`

**Emits:**
- `update:searchQuery`
- `select(id: string)`
- `edit(id: string)`
- `remove(id: string)`
- `load-more`

**CSS:** Extracted to `admin-item-list.css` (shared, not scoped).

### 2.2 `AdminItemEditPanel.vue`

Merges `ContentEditPanel.vue` and `UploadsEditPanel.vue`.

Both panels share the same core fields (title, description, category, order, published, hidden). The only structural difference is the category options source (`groupedCategoryOptions` for content, `categoryOptions` for uploads). Both are passed as the same `categoryOptions` prop — the parent view provides the appropriate list. No slots needed; the form fields are identical.

**Props:**
- `editingItem: AdminItemRow | null`
- `categoryOptions: { value: string; label: string }[]`
- `saving: boolean`
- `feedback: string`
- `feedbackError: boolean`

**Emits:**
- `save(fields: Record<string, unknown>)`
- `cancel`

Retains sticky positioning and mobile responsive collapse.

### 2.3 `useAdminMobileFocus.ts`

Merges three near-identical helpers into one generic composable.

```ts
function useAdminMobileFocus(opts: {
  breakpoint?: number;           // default 960
  targets: Record<string, Ref<HTMLElement | null>>;
}): {
  focusTarget(key: string): Promise<void>;
}
```

Replaces:
- `useAdminMobileEditPanelFocus.ts`
- `useAdminLibraryMobileInspectorFocus.ts`
- `useAdminTaxonomyMobileEditorFocus.ts`

---

## 3. Library View Restructure

### 3.1 VM injection

Use a typed `InjectionKey` for type safety:

```ts
// src/features/library/libraryVmKey.ts
import type { InjectionKey } from 'vue';
import type { LibraryAdminState } from './useLibraryAdminState';
export const libraryVmKey: InjectionKey<LibraryAdminState> = Symbol('libraryVm');
```

```
AdminLibraryView.vue
  ├─ const vm = reactive(useLibraryAdminState())
  ├─ provide(libraryVmKey, vm)
  └─ Child components: inject(libraryVmKey)!
```

Parent template reduces from 543 lines to ~40 lines (layout skeleton only).

### 3.2 New sub-components

| Component | Responsibility | Source lines |
|-----------|---------------|-------------|
| `LibraryFolderSidebar.vue` | Folder list + search + create form | Template L41-97 |
| `LibraryAssetList.vue` | Asset list + filters + batch ops + deleted list | Template L99-259 |
| `LibraryInspectorPanel.vue` | Tab switching + folder/asset/embed panels | Template L262-535 |
| `LibraryOperationLog.vue` | Operation log with filter + clear | Template L511-535 |

`EmbedProfileCreatePanel.vue` and `EmbedProfileEditPanel.vue` remain unchanged.

### 3.3 Deleted files

- `AdminLibraryView.template.html` — content distributed to sub-components
- `panels/FolderPanel.vue` — slot wrapper, no longer needed
- `panels/AssetPanel.vue` — slot wrapper, no longer needed
- `panels/EmbedPanel.vue` — slot wrapper, no longer needed
- `panels/OperationLogPanel.vue` — slot wrapper, replaced by LibraryOperationLog

### 3.4 CSS split

`AdminLibraryView.css` splits into:

- `library-base.css` — workbench grid, metric grid, responsive breakpoints
- `library-sidebar.css` — folder sidebar styles
- `library-asset-list.css` — asset list, batch toolbar, dropdown menus
- `library-inspector.css` — panel tabs, section toggles, editor styles

`AdminLibraryActivity.css` (operation log + deleted-assets styles) is merged into `library-asset-list.css` (deleted-assets section) and the new `LibraryOperationLog.vue` scoped style (log-specific styles).

---

## 4. GroupEditorPanel Decomposition

Current: 22 props, 17 emits in one component combining three forms.

### 4.1 New components

| Component | Props (count) | Emits (count) |
|-----------|--------------|---------------|
| `CreateGroupForm.vue` | draft fields, saving, categoryOptions (~6) | submit, field-error (~3) |
| `EditGroupForm.vue` | selectedGroup, draft fields, saving (~7) | save, cancel, remove (~4) |
| `CreateCategoryForm.vue` | selectedGroup, draft fields, saving (~6) | submit, field-error (~3) |

### 4.2 Integration

`AdminTaxonomyView.vue` uses `v-if` to switch between forms based on selection state. Props sourced from `useTaxonomyAdminDraftState`.

`TaxonomyTreePanel.vue` and `CategoryEditorPanel.vue` remain unchanged — they are already well-scoped single-responsibility components.

---

## 5. Route Lazy Loading

All 8 admin child views converted to dynamic imports in `routes.ts`:

```ts
const AdminDashboardView = () => import('../views/admin/AdminDashboardView.vue')
const AdminContentView = () => import('../views/admin/AdminContentView.vue')
const AdminUploadsView = () => import('../views/admin/AdminUploadsView.vue')
const AdminLibraryView = () => import('../views/admin/AdminLibraryView.vue')
const AdminTaxonomyView = () => import('../views/admin/AdminTaxonomyView.vue')
const AdminSystemView = () => import('../views/admin/AdminSystemView.vue')
const AdminAccountView = () => import('../views/admin/AdminAccountView.vue')
```

`AdminLayoutView` stays synchronous (layout shell must be immediately available).

---

## 6. Test Strategy

### 6.1 Tests requiring path/assertion updates

- `test/admin-style-semantics.test.ts` — remove reads of deleted column/panel files, update `admin-card` source checks
- `test/library-admin-layout.test.ts` — update `readLibrarySources()` to read new sub-components instead of deleted files; update grid/layout assertions
- `test/admin-visual-polish.test.ts` — update library template source path
- `test/admin-mobile-edit-panel-focus.test.ts` — rewrite to test `useAdminMobileFocus` generic helper
- `test/admin-taxonomy-mobile-edit-focus.test.ts` — rewrite to test `useAdminMobileFocus`
- `test/admin-content-*.test.ts` — update component references from `ContentListPanel`/`ContentEditPanel` to `AdminItemListPanel`/`AdminItemEditPanel`
- `test/admin-uploads-*.test.ts` — same updates for uploads

### 6.2 New tests

- Smoke test for `AdminItemListPanel` (renders items, emits search/select/edit/remove)
- Smoke test for `AdminItemEditPanel` (renders form, emits save/cancel)
- Smoke test for library sub-components (each renders with injected vm)
- Smoke test for `CreateGroupForm`, `EditGroupForm`, `CreateCategoryForm`

### 6.3 Unchanged tests

- All composable tests (`useLibraryAdminState`, `useTaxonomyAdmin`, etc.) — state layer is not modified
- `test/admin-shell-structure.test.ts` — layout shell unchanged
- `test/admin-account-*.test.ts` — AccountView unchanged

---

## 7. Implementation Order

1. Promote shared styles to `admin-base.css`, unify class names
2. Create `AdminItemListPanel` + `AdminItemEditPanel`, rewrite Content/Uploads views
3. Create `useAdminMobileFocus`, replace three helpers
4. Decompose library: create sub-components with provide/inject, split CSS
5. Decompose `GroupEditorPanel` into three forms
6. Convert routes to lazy loading
7. Update all tests, run full suite

## 8. Files Affected

### New files
- `src/components/admin/AdminItemListPanel.vue`
- `src/components/admin/AdminItemEditPanel.vue`
- `src/components/admin/admin-item-list.css`
- `src/features/admin/composables/useAdminMobileFocus.ts`
- `src/features/library/libraryVmKey.ts`
- `src/views/admin/library/LibraryFolderSidebar.vue`
- `src/views/admin/library/LibraryAssetList.vue`
- `src/views/admin/library/LibraryInspectorPanel.vue`
- `src/views/admin/library/LibraryOperationLog.vue`
- `src/views/admin/library/library-base.css`
- `src/views/admin/library/library-sidebar.css`
- `src/views/admin/library/library-asset-list.css`
- `src/views/admin/library/library-inspector.css`
- `src/views/admin/taxonomy/CreateGroupForm.vue`
- `src/views/admin/taxonomy/EditGroupForm.vue`
- `src/views/admin/taxonomy/CreateCategoryForm.vue`

### Modified files
- `src/styles/admin-base.css` — add promoted classes
- `src/views/admin/AdminContentView.vue` — use shared components
- `src/views/admin/AdminUploadsView.vue` — use shared components
- `src/views/admin/AdminLibraryView.vue` — provide/inject, layout skeleton
- `src/views/admin/AdminTaxonomyView.vue` — use decomposed forms
- `src/views/admin/system/SystemEmbedUpdaterPanel.vue` — unify field classes
- `src/router/routes.ts` — lazy loading
- `test/library-admin-layout.test.ts` — update assertions
- `test/admin-style-semantics.test.ts` — update assertions
- Multiple other test files — path/class updates

### Deleted files
- `src/views/admin/library/AdminLibraryView.template.html`
- `src/views/admin/library/AdminLibraryView.css`
- `src/views/admin/library/AdminLibraryActivity.css`
- `src/views/admin/library/panels/FolderPanel.vue`
- `src/views/admin/library/panels/AssetPanel.vue`
- `src/views/admin/library/panels/EmbedPanel.vue`
- `src/views/admin/library/panels/OperationLogPanel.vue`
- `src/views/admin/content/ContentListPanel.vue`
- `src/views/admin/content/ContentEditPanel.vue`
- `src/views/admin/uploads/UploadsListPanel.vue`
- `src/views/admin/uploads/UploadsEditPanel.vue`
- `src/views/admin/useAdminMobileEditPanelFocus.ts`
- `src/views/admin/library/useAdminLibraryMobileInspectorFocus.ts`
- `src/views/admin/taxonomy/useAdminTaxonomyMobileEditorFocus.ts`
- `src/views/admin/taxonomy/GroupEditorPanel.vue`
