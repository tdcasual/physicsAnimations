# Teacher Workspace Phase 2 Design

## Summary

Phase 1 proved that **recently viewed + favorites** can make the catalog feel more useful on repeat visits, but the current experience still behaves like a lightweight shortcut strip rather than a true teacher workspace. The next phase should make the workflow more dependable, more legible, and more classroom-oriented without adding a new dashboard route or server-side personalization.

The recommended direction is to keep the workflow **local-first and route-light**, while strengthening three things:

1. **stability** — quick-access ordering, pruning, and return targets should feel predictable
2. **guidance** — empty states and helper copy should tell teachers what to do next
3. **continuity** — catalog, viewer, and library should behave like one repeat-use loop instead of three adjacent surfaces

The product should still remain browse-friendly for first-time users. Phase 2 is not about turning the homepage into a dense control center. It is about making the second, third, and tenth teacher visit feel faster and calmer.

## Current State

Already shipped in Phase 1:

- viewer launches record recent activity in `frontend/src/features/catalog/recentActivity.ts`
- viewer supports favorite toggle via `frontend/src/features/catalog/favorites.ts`
- catalog exposes teacher quick access through `recentItems` and `favoriteItems`
- library folders include return links to `#catalog-recent` and `#catalog-favorites`
- back-navigation fallback hashes preserve some workflow continuity

What still feels incomplete:

- persistence stores only `id + timestamp`, so quick access depends entirely on live catalog hydration and cannot express richer local context
- quick-access sections are visually present, but they do not summarize why an item is useful “now” for teaching
- empty states explain the mechanic, but not the likely next classroom action
- library-to-catalog return affordances exist, but they do not reinforce a stronger “teaching workspace” mental model
- cross-device sync remains intentionally deferred, but that decision is not yet formalized as a product contract

## Options

### Option A: Refine local-first quick access only

Keep recent + favorites as the entire model, but improve ranking rules, empty states, and return behavior.

**Pros**
- smallest implementation risk
- no new persistence model beyond the current local-first storage
- easiest to validate with current catalog/viewer/library architecture

**Cons**
- still reads as a shortcut layer more than a planning workspace
- limited room for richer teacher context without better surface design

### Option B: Add a lightweight teaching workspace summary (**recommended**)

Keep recent + favorites as the underlying state, but add a thin summary layer in catalog and library that explains what is ready for class right now.

**Pros**
- improves perceived usefulness without adding route or data-model complexity
- creates a stronger repeated-use identity for the product
- keeps scope compatible with a short implementation slice

**Cons**
- requires careful copy and hierarchy tuning so the homepage does not become noisy
- needs stronger pruning and ranking rules so the summary feels trustworthy

### Option C: Introduce lesson sets now

Add a manually curated temporary collection or ordered queue.

**Pros**
- strongest classroom-specific mental model

**Cons**
- requires ordering, editing, removal, and more complex state management
- risks over-expanding scope before current repeat-use primitives are fully polished

**Decision:** ship Option B now, and continue to defer lesson sets.

## Product Contract

### Core principle

The workspace should answer: **“What should I open next for class?”**

It should not try to answer:
- long-term content planning
- cross-device teacher identity
- curriculum-level sequencing

### Phase 2 behavior

- The catalog quick-access area should show not only lists, but a compact summary of the teacher’s current workspace state.
- Recent activity should remain newest-first, deduped by id, and trimmed to a small fixed cap.
- Favorites should remain explicit and stable, but should also preserve the order of most recently favorited items.
- Stale records should continue to be silently pruned during catalog hydration.
- The library surface should reinforce return-to-workspace actions with stronger teaching-oriented labels.
- The viewer should preserve the same local-first write behavior, but the surrounding copy should make the action feel like “pinning for class” rather than only “favoriting”.

### Non-goals

- no new top-level route
- no server persistence
- no lesson queue ordering
- no folder favoriting
- no admin-side management UI

## Surface Changes

### Catalog

The catalog should keep the current quick-access area near the top, but turn it into a clearer **teaching workspace summary**.

Recommended shape:

- a short summary rail above or within the quick-access area
- one summary block answering “recently active” state
- one summary block answering “pinned for repeat use” state
- existing recent/favorites sections remain as the detailed entry lists below that summary

What the summary should communicate:

- whether the teacher has recent lesson momentum
- whether there are stable pinned demos ready to reopen
- what the quickest next action is

Empty-state copy should shift from descriptive to instructional:

- recent: “先打开一个演示，课前回放和课中重开会从这里开始。”
- favorites: “把高频演示钉在这里，下一节课不用重新搜索。”

### Viewer

The viewer remains the write surface, but the favorite action should read more like a repeat-use teaching tool.

Recommended copy direction:

- default: `加入常用演示`
- active: `已加入常用演示`

If existing tests or copy constraints make a full rename too disruptive, the fallback is to keep the current label and strengthen supporting helper text nearby.

The viewer should also keep writing recent activity only when the model is ready, exactly as it does now.

### Library

The folder hero already provides return shortcuts. Phase 2 should strengthen the framing:

- `回到最近课堂入口`
- `查看已固定演示`

If copy changes are too disruptive for the current route, keep the link targets but improve surrounding summary text so the library feels like support material for the same teacher workspace.

## Persistence And Ranking Rules

The current storage model (`id + timestamp`) is still sufficient for Phase 2.

### Recent activity

Rules stay:
- dedupe by `id`
- newest first
- max 12 stored items
- catalog renders top 4

Phase 2 addition:
- when multiple valid recent entries exist, the summary block should derive its state from the rendered top slice only, not from hidden overflow items

### Favorites

Rules stay:
- toggle semantics
- newest favorite first
- max 24 stored items
- catalog renders top 4

Phase 2 addition:
- favorites summary should distinguish between “has at least one pinned demo” and “empty but ready to pin”, using the visible rendered slice

### Sync decision

Cross-device sync remains deferred.

Explicit product stance for now:
- the workflow is optimized for one teacher on one browser/device
- if sync is added later, it should preserve the same recent/favorites semantics rather than invent a new model

## Mobile Behavior

Phase 2 must remain mobile-safe.

Requirements:
- teacher workspace summary stays above category navigation
- no horizontal-only interaction required
- quick-access sections remain stacked and scannable
- all primary actions keep 44px+ tap targets
- return-to-workspace actions in library stay visible before the asset list

Mobile success metric:
- a returning teacher can get from catalog homepage to a useful demo in **2 taps or fewer** when recent or favorites are populated

## Success Metrics

Qualitative success:
- the top of the catalog feels like a repeat-use workspace, not just browse scaffolding
- the library feels connected to the same classroom loop
- empty states feel actionable rather than decorative

Behavioral success:
- recent/favorite sections stay stable after refresh
- stale ids never render broken cards
- teacher can reopen a prior demo quickly without re-searching

Implementation success:
- no new route-level complexity explosion
- no maintainability-budget regression in `CatalogView.vue`
- tests validate behavior rather than depending on source-hook strings

## Implementation Notes

Recommended implementation boundary:

- keep persistence helpers in `recentActivity.ts` and `favorites.ts`
- keep derivation in `useCatalogViewState.ts`
- add lightweight presentational components for the new workspace summary / empty-state treatment if needed
- avoid pushing more logic back into `CatalogView.vue`

Recommended next implementation slice:

1. add failing tests for teacher workspace summary and improved empty states
2. add the catalog summary component(s)
3. refine library shortcut framing
4. verify return-navigation and persistence tests still pass
