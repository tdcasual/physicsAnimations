# Navigation UI Refresh Design

## Summary

This design refreshes the project UI toward a navigation-first experience. The main goal is to make the public entry page feel like a clear launch surface instead of a plain content list, while also bringing the admin area closer to a structured workspace. The design prioritizes both teacher-led usage and student self-exploration, with desktop-first layout decisions and mobile-specific interaction restructuring instead of simple layout compression.

## Current Problems

### Public navigation issues

- The top bar is functional but too thin in hierarchy, so the brand, utility actions, and entry actions compete for attention.
- The catalog page behaves like a direct list view instead of a guided navigation hub.
- Search, group switching, category switching, and content cards all sit at a similar visual weight.
- First-time visitors are not clearly told where to start.
- Returning users do not get any quick path for recent or common actions.

### Admin navigation issues

- The admin navigation is usable, but it reads as a row of pills rather than a real workspace structure.
- Module switching lacks stronger position feedback and task context.
- Mobile behavior keeps the navigation available, but does not fully reorganize around small-screen task flows.

## Target Users

This refresh optimizes for two user groups at the same time:

- Teachers who need fast entry, predictable navigation, low-friction switching, and presentation-friendly layouts.
- Students or visitors who need a discoverable structure, clearer entry points, and less cognitive load when browsing.

## Design Goals

1. Make the public homepage a navigation hub instead of a flat list.
2. Reduce the time needed to reach a target animation, upload, or library asset.
3. Preserve existing routing concepts while improving wayfinding and context.
4. Keep desktop efficient while making mobile behavior intentionally restructured.
5. Improve visual hierarchy without introducing heavy, decorative UI.

## Design Principles

- Navigation before decoration.
- Fast path for repeat users, clear path for first-time users.
- Responsive reflow, not just responsive shrinking.
- Fewer simultaneous decisions on small screens.
- Feedback and orientation must always be visible.

## Public Homepage Information Architecture

The public homepage should move to a three-layer structure.

### Layer 1: task entry

This area appears first and should contain:

- page title and short supporting description
- primary search input
- primary quick actions such as continue browsing and open library
- secondary utility such as classroom mode

This layer answers: what can I do right now?

### Layer 2: navigation discovery

This area should introduce grouped navigation rather than relying on a flat tab flow.

Recommended structure:

- primary domain groups such as mechanics, electricity, optics, experiments, or library resources
- visible high-frequency subgroup shortcuts under the active group
- explicit current selection state

This layer answers: I know the general topic, where do I go next?

### Layer 3: guided content

Only after the first two layers should the page present content blocks such as:

- featured demonstrations
- recently updated content
- classroom-friendly picks
- library highlights

This layer answers: what should I open if I am browsing rather than targeting?

## Public Homepage Modules

The public page should be assembled from six modules.

1. Light hero
   - title
   - short description
   - search
   - two primary actions
2. Quick access area
   - recent items
   - common categories
   - classroom-friendly shortcuts
3. Primary navigation
   - grouped topic navigation
   - clearer active state
4. Secondary filters or topic shortcuts
   - visible on desktop
   - collapsible on mobile
5. Recommended content blocks
   - small curated sections with "more" actions
6. Content card stream
   - still available, but demoted from being the whole homepage

## Responsive Strategy

This project should follow a desktop-first but mobile-restructured approach.

### Desktop (`>= 1024px`)

- keep the full navigation homepage
- show quick actions and grouped discovery together
- allow sticky navigation behavior when scrolling
- use multi-column content blocks where useful

### Tablet (`640px - 1023px`)

- preserve the same content architecture
- reduce simultaneous columns
- compress secondary information
- keep group switching visible

### Mobile (`< 640px`)

- keep search as the strongest first action
- convert secondary filters into an expandable panel or drawer
- display cards in a single enhanced column
- prioritize recent items and common actions near the top
- avoid forcing users to horizontally scan too many parallel controls

## Dynamic Interaction Design

### Public navigation behavior

- Search should not reset the full navigation context unexpectedly.
- Switching top-level groups should update the content area smoothly without making the page feel like a full reload.
- Returning from the viewer should preserve navigation context when possible.
- Sticky navigation may be used for top-level group switching on larger screens.
- Mobile filters should open in a controlled surface instead of adding more inline clutter.

### Feedback behavior

- active category and group states should be visually distinct
- loading and empty states should feel intentional, not like fallback text blocks
- hover, focus, and active feedback should share the same motion language
- transitions should be short and functional, roughly 120ms to 180ms

## Visual Direction

The visual update should improve hierarchy more than ornament.

### Recommended approach

- use a light hero rather than a large marketing banner
- establish clear three-level visual weight
- keep standard cards calm and consistent
- allow featured or classroom-focused cards to carry stronger emphasis
- keep color, shadow, and motion disciplined so the app feels sharper rather than louder

### Hierarchy model

- level 1: search, primary actions, current context
- level 2: grouped navigation, quick-access modules
- level 3: standard content cards and supporting metadata

## Admin Experience Refresh

The admin area should evolve from a simple horizontal pill list into a light workspace shell.

### Desktop admin structure

Recommended pattern:

- lightweight global header remains
- admin shell gains a left-side grouped navigation or a clearer persistent module rail
- page titles include subtitle or task framing
- important actions remain close to the active workspace rather than mixed into navigation

Suggested admin groups:

- overview
- content management
- structure management
- system settings

### Mobile admin structure

- current page title stays visible
- primary admin navigation moves into a drawer or collapsible menu
- page-specific actions are separated from global module switching
- destructive and save actions should remain easy to reach without crowding the header

## Candidate Deliverables

### Phase 1: public navigation refresh

- redesign public homepage hierarchy
- add quick access and grouped navigation
- improve card grouping and recommendation sections
- improve mobile navigation and filtering behavior

### Phase 2: admin shell refresh

- restructure admin navigation
- improve page context, titles, and task grouping
- align mobile admin behavior with small-screen workflows

### Phase 3: interaction polish

- preserve scroll and browsing context
- refine sticky behavior and motion
- unify empty, loading, hover, and active states
- improve classroom and presentation readability

## Success Criteria

The redesign is successful when:

- a first-time user understands what to do within a few seconds
- a teacher can reach a target item faster than in the current catalog flow
- mobile users can search, switch topics, and return without friction
- the admin area feels like part of the same product system as the public UI
- responsive behavior feels intentionally designed rather than compressed

## Suggested Implementation Surface

Likely first-pass implementation files:

- `frontend/src/App.vue`
- `frontend/src/views/CatalogView.vue`
- `frontend/src/views/admin/AdminLayoutView.vue`
- `frontend/src/styles.css`

Potential follow-up files:

- `frontend/src/features/catalog/useCatalogViewState.ts`
- `frontend/src/router/routes.ts`
- related UI tests in `frontend/test/`

## Out of Scope for the First Iteration

- a full visual brand redesign
- animation-heavy landing page behavior
- major route model changes
- advanced personalization logic beyond lightweight recent/common entries

## Next Step

The next step should be a detailed implementation plan focused on:

1. public homepage information hierarchy
2. responsive navigation behavior
3. admin shell restructuring
4. validation via focused UI tests and smoke checks
