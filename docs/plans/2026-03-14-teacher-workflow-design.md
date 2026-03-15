# Teacher Workflow Design

## Summary

This phase should add one lightweight repeat-use workflow for teachers: **recently viewed + favorite demos**. The goal is to make the atlas feel useful on the second classroom visit, not just on the first browse. The workflow should stay local-first, route-light, and compatible with the current catalog → viewer → library structure.

The recommended product shape is a **teaching quick-access layer** that sits above the main catalog navigation:

- `recently viewed`: auto-built from actual viewer launches
- `favorite demos`: explicit teacher curation for high-frequency items
- `lesson queue`: intentionally deferred until the first two prove useful

This keeps the public homepage browse-first while finally giving returning teachers a faster path than repeating search + category drilling.

## Decision

### Option A: recently viewed only

Pros:

- smallest implementation
- no new explicit interaction
- immediately useful after one session

Cons:

- does not help teachers pin stable “always use this” demos
- weak long-term value for repeated classroom prep

### Option B: recently viewed + favorites (**recommended**)

Pros:

- balances passive memory and active curation
- works across prep, rehearsal, and live teaching
- fits the existing catalog/viewer/library surfaces with minimal route churn

Cons:

- introduces a small new action in the viewer and catalog cards
- needs lightweight persistence cleanup logic

### Option C: add lesson queue now

Pros:

- most classroom-specific concept

Cons:

- needs ordering, editing, and stronger return-state behavior
- expands scope beyond a one-week slice
- risks turning the public homepage into a dashboard too early

**Decision:** ship Option B now and explicitly defer queue management.

## Target User And Moment

Primary user: a teacher who already knows the product and is preparing for class, testing demo flow before class, or reopening the same core experiments during repeated lessons.

Primary moments:

1. **before class**: “I need the 2–4 demos I always use for this unit.”
2. **during class**: “I just opened one demo; I may need the previous one again.”
3. **after class / prep**: “I need the related resource folder without losing my way back.”

The workflow is not for deep personalization. It is a small memory layer that reduces navigation friction for repeat usage.

## Product Contract

### Core behavior

- Opening a valid viewer item writes a recent-activity record automatically.
- Teachers can favorite or unfavorite a demo from the viewer.
- The catalog homepage exposes recent and favorite items as first-class quick-access sections.
- The library folder page exposes a lightweight return path back to the teaching quick-access layer.
- The workflow works without login and without server storage.

### Non-goals

- no queue ordering
- no folders-as-favorites in v1
- no cross-device sync
- no modal workflow management
- no admin dependency

## Entry Points

### Catalog

Add one new section between the hero and the main navigation: **教学快捷入口**.

Desktop/tablet:

- two compact columns: `最近查看` and `收藏演示`
- each column shows up to 4 items
- each item uses the same visual card language as current catalog cards, but denser
- each column includes a small empty state rather than disappearing entirely

Mobile:

- keep the section near the top
- switch to a segmented toggle or stacked blocks instead of two equal columns
- show up to 2 items per block before a “查看更多” affordance

Catalog responsibilities:

- recent items should be derived from persisted ids but rendered only if they still exist in current catalog data
- favorite items should also validate against current catalog data before rendering
- current group/category context should remain intact; quick-access is a shortcut layer, not a new navigation mode

### Viewer

The viewer is the write surface.

Add a visible secondary action in the sticky action bar:

- default state: `收藏演示`
- active state: `已收藏`

Viewer responsibilities:

- after `loadViewerModel()` returns a ready item, write/update recent activity
- use the resolved item payload as the source of truth for title, thumbnail, href, type, and category id
- if the item is invalid or fails to load, do not write activity
- if the teacher favorites from the viewer, update UI optimistically and persist immediately

The existing back action should keep working as-is when real history exists. For direct-entry fallback, the next implementation pass should support section-aware fallback targets so workflow launches can return to `#catalog-recent` or `#catalog-favorites` when appropriate instead of always plain home.

### Library

The library page should not become another management surface. It only needs a quick bridge back into the repeat-use flow.

Add a compact helper area in the folder hero:

- `回到最近查看`
- `查看收藏演示`

Behavior:

- both actions route back to catalog anchors
- library remains resource-supportive, not the source of favorites
- this preserves the idea that library folders complement demos rather than replace them

## Empty States

### No recent activity

Show a teaching-oriented empty state:

- title: `最近查看会出现在这里`
- supporting copy explains that opening a demo once is enough to build the list
- CTA points to current browse content, not a special management page

### No favorites

Show a simple teaching cue:

- title: `把常用演示钉在这里`
- supporting copy tells the teacher to favorite from the viewer
- CTA points to recommended or current demos

### Stale items

If a recent or favorite item no longer exists in catalog data:

- silently prune it during catalog hydration
- do not render broken cards
- avoid exposing error badges in this first iteration

## Mobile Behavior

The quick-access workflow must adapt, not disappear.

- keep the teacher shortcut section above category navigation
- compress into one-column blocks
- maintain 44px+ tap targets
- do not require horizontal carousels for the primary path
- preserve viewer favorite action in the sticky action bar
- keep library return shortcuts visible in the hero before the asset list

Mobile success means a returning teacher can reopen a prior demo in **2 taps or fewer** from the homepage.

## Persistence Strategy

Use local-first browser storage, aligned with existing catalog state persistence.

### Recent activity

Recommended file: `frontend/src/features/catalog/recentActivity.ts`

Suggested record shape:

- `id`
- `title`
- `href`
- `thumbnail`
- `type`
- `categoryId`
- `lastViewedAt`

Rules:

- storage key: `pa_recent_activity_v1`
- dedupe by `id`
- newest first
- keep max 12 records
- write only from ready viewer state

### Favorites

Recommended file: `frontend/src/features/catalog/favorites.ts`

Suggested record shape:

- `id`
- `title`
- `href`
- `thumbnail`
- `type`
- `categoryId`
- `favoritedAt`

Rules:

- storage key: `pa_favorite_demos_v1`
- dedupe by `id`
- keep max 24 items
- allow toggle semantics
- persist snapshots so catalog can render without extra network requests

### Validation on catalog load

`useCatalogViewState.ts` should:

- load both persisted collections
- map them against the current catalog item list
- drop stale ids
- expose `recentItems` and `favoriteItems` as ready-to-render arrays
- avoid mutating current group/category/query state when quick-access data changes

## Data Flow

1. Catalog loads catalog data and existing view state.
2. Catalog loads recent/favorite snapshots from local storage.
3. Catalog validates snapshots against current item inventory.
4. Catalog renders quick-access sections above navigation.
5. Teacher opens a viewer item.
6. Viewer resolves item metadata and writes recent activity.
7. Teacher optionally toggles favorite.
8. Returning to catalog shows updated quick-access content without changing browse context.

## Error Handling And Edge Cases

- viewer load failure writes nothing
- malformed local storage falls back to empty collections
- duplicate writes move the item to the top instead of duplicating
- empty thumbnails still render card placeholders
- direct-entry viewer pages still work even when no catalog state exists
- quick-access sections should not block catalog render if persistence helpers fail

## Implementation Surface

Expected implementation files:

- `frontend/src/features/catalog/recentActivity.ts`
- `frontend/src/features/catalog/favorites.ts`
- `frontend/src/features/catalog/useCatalogViewState.ts`
- `frontend/src/features/navigation/backNavigation.ts`
- `frontend/src/views/CatalogView.vue`
- `frontend/src/views/ViewerView.vue`
- `frontend/src/views/LibraryFolderView.vue`

Recommended implementation shape:

- keep storage helpers framework-agnostic and unit-testable
- keep catalog rendering decisions inside `useCatalogViewState.ts`
- keep viewer write behavior inside `ViewerView.vue` or a tiny viewer-side helper
- avoid new global store dependencies

## Test Contract

The first implementation pass should prove:

1. viewer visit writes recent activity
2. duplicate viewer visits reorder instead of duplicate
3. favorite toggle persists and removes correctly
4. catalog renders recent and favorite sections from persisted data
5. stale ids are pruned during catalog hydration
6. viewer/library back flows still use shared navigation logic
7. direct-entry fallback can target workflow anchors when source metadata exists

## Success Metrics

Product metrics for this slice:

- repeat users can reopen a prior demo from homepage in 2 taps or fewer
- favorites are reachable from homepage without search or category switching
- catalog retains current browse context after returning from viewer
- the new quick-access layer does not dominate the homepage over primary browse/navigation

Validation metrics for this phase:

- targeted tests pass for persistence, return navigation, catalog sections, viewer action bar, and library folder shortcuts
- implementation remains local-first with no API additions
- scope stays within recent + favorites only

## Follow-up After This Slice

If this workflow proves useful, the next product step can be a lightweight **lesson queue** that reuses the same item snapshot model and section-aware return behavior. That work should start only after recent/favorites feel stable and visually calm.
