# Embed Auto Updater Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the maintenance updater so a single task can manage GeoGebra bundle refreshes and automatic embed profile mirroring, with a default 20-day interval configurable from the admin system settings page.

**Architecture:** Keep the existing one-shot maintenance container model, but add a generic runner that executes on a fixed host schedule and decides whether work is due based on persisted system settings. Persist updater settings and runtime status in `content/system.json`, expose them through `/api/system`, and add a dedicated system settings panel in the admin UI.

**Tech Stack:** Node.js, Express, Vue 3 + TypeScript, existing library service/store abstractions, Docker Compose maintenance profile, Node test runner, Vitest.

---

### Task 1: Persist updater settings in system state and expose them via API

**Files:**
- Modify: `server/lib/systemState.js`
- Modify: `server/routes/system.js`
- Add test: `tests/system-state-normalization.test.js`
- Add test: `tests/system-state.test.js`

**Step 1: Write the failing tests**
- Add normalization coverage for a new `embedUpdater` block with defaults:
  - `enabled: true`
  - `intervalDays: 20`
  - empty runtime metadata fields
- Add API coverage proving `GET /api/system` returns the new block and `POST /api/system/embed-updater` persists updates.

**Step 2: Run tests to verify failure**
- `node --test tests/system-state-normalization.test.js tests/system-state.test.js`
- Expected: failures for missing `embedUpdater` defaults and unknown route/response fields.

**Step 3: Write minimal implementation**
- Extend `buildEnvDefaults()` / `normalizeState()` with `embedUpdater` defaults and bounds checking for `intervalDays`.
- Add helpers to compute `nextRunAt` from `lastRunAt` and `intervalDays`.
- Extend `GET /api/system` response to include updater settings/status.
- Add `POST /api/system/embed-updater` route with validation and audit logging.

**Step 4: Run tests to verify pass**
- `node --test tests/system-state-normalization.test.js tests/system-state.test.js`
- Expected: PASS.

### Task 2: Add generic maintenance runner for GeoGebra + embed profiles

**Files:**
- Add: `scripts/update_embed_maintenance.js`
- Modify: `scripts/run_geogebra_updater.sh`
- Modify: `package.json`
- Add test: `tests/update-embed-maintenance.test.js`
- Modify: `server/services/library/libraryService.js` (only if a small public helper is needed)

**Step 1: Write the failing tests**
- Add script-level coverage for:
  - updater disabled => exits without syncing
  - not due yet => reports skip
  - due => updates runtime status and invokes embed profile sync for eligible HTTP profiles
  - failures => records `lastError` / partial summary without corrupting settings

**Step 2: Run tests to verify failure**
- `node --test tests/update-embed-maintenance.test.js`
- Expected: FAIL because the runner does not exist yet.

**Step 3: Write minimal implementation**
- Create a maintenance runner that:
  - loads system state
  - checks global enable flag + interval window
  - runs GeoGebra bundle update (best effort)
  - creates a content store from system state
  - creates library service and syncs enabled remote embed profiles sequentially
  - persists runtime metadata (`lastCheckedAt`, `lastRunAt`, `lastSuccessAt`, `lastError`, summary)
- Keep `ggb-updater` container compatibility by making `scripts/run_geogebra_updater.sh` call the new runner.
- Add npm scripts for manual local execution.

**Step 4: Run tests to verify pass**
- `node --test tests/update-embed-maintenance.test.js`
- Expected: PASS.

### Task 3: Expose updater controls in admin system settings

**Files:**
- Modify: `frontend/src/features/admin/adminApi.ts`
- Modify: `frontend/src/features/admin/system/useSystemWizard.ts`
- Modify: `frontend/src/features/admin/system/useSystemWizardActions.ts`
- Modify: `frontend/src/views/admin/AdminSystemView.vue`
- Add: `frontend/src/views/admin/system/SystemEmbedUpdaterPanel.vue`
- Add test: `frontend/test/admin-system-embed-updater.test.ts`

**Step 1: Write the failing tests**
- Add a source-structure/UI contract test that checks:
  - system page renders a dedicated updater panel
  - the panel exposes enable toggle and interval-days field
  - system API wiring includes a dedicated updater update call

**Step 2: Run tests to verify failure**
- `npm --prefix frontend run test -- admin-system-embed-updater.test.ts`
- Expected: FAIL because the panel and API wiring are absent.

**Step 3: Write minimal implementation**
- Add typed client API calls for updater settings.
- Load updater state from `/api/system`.
- Render a dedicated card in the system page showing current status, enable toggle, and interval-days input.
- Support save feedback, readonly guards, and sensible validation (`1-365` days).

**Step 4: Run tests to verify pass**
- `npm --prefix frontend run test -- admin-system-embed-updater.test.ts`
- Expected: PASS.

### Task 4: Update deployment docs and verify the end-to-end contract

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/deployment.md`
- Modify: `docs/guides/configuration.md`
- Add test: `tests/configuration-doc-embed-updater.test.js`

**Step 1: Write the failing docs test**
- Assert the docs mention:
  - the updater now covers GeoGebra + remote embed profiles
  - host scheduler should run the maintenance container frequently (for example daily)
  - actual execution cadence is controlled by system settings, default 20 days

**Step 2: Run tests to verify failure**
- `node --test tests/configuration-doc-embed-updater.test.js`
- Expected: FAIL until docs are updated.

**Step 3: Update docs**
- Describe backward-compatible `ggb-updater` behavior.
- Document the new system setting and recommended scheduler cadence.
- Keep GeoGebra-only manual command docs where still useful.

**Step 4: Run targeted verification**
- `node --test tests/system-state-normalization.test.js tests/system-state.test.js tests/update-embed-maintenance.test.js tests/configuration-doc-embed-updater.test.js`
- `npm --prefix frontend run test -- admin-system-embed-updater.test.ts admin-system-feedback-hints.test.ts admin-system-readonly-guards.test.ts`
- Expected: PASS.

### Task 5: Final validation

**Files:**
- Verify only modified files from tasks above

**Step 1: Run focused validation**
- `node --test tests/system-state-normalization.test.js tests/system-state.test.js tests/update-embed-maintenance.test.js tests/configuration-doc-embed-updater.test.js`
- `npm --prefix frontend run test -- admin-system-embed-updater.test.ts admin-system-validation-state.test.ts admin-system-feedback-hints.test.ts admin-system-readonly-guards.test.ts admin-system-timeout-clear.test.ts`

**Step 2: Run broader safety checks if needed**
- `npm run test -- tests/library-embed-profile-update-sync-state.test.js`
- `npm run guard:file-size`

**Step 3: Review diff and handoff**
- Summarize settings behavior, scheduler behavior, and deployment changes.
