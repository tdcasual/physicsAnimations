# Embed Module Reliability Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise the embed module from "usable" to "high-confidence production" by closing frontend-operability gaps, reducing backend complexity hot spots, and stabilizing test/guard signals.

**Architecture:** Keep current API and data model as the mainline, then refactor internals by extraction (not rewrite): split sync pipeline/parser complexity into focused modules while preserving behavior. Expose existing backend capabilities (`sync/cancel/rollback/sync report`) completely in admin UI and frontend API client, then lock with contract tests.

**Tech Stack:** Node.js (`node --test`), Express routes/services, Vue 3 + TypeScript (frontend), Vitest, in-repo file budget guard script.

---

## Scope And Non-Goals

- In scope:
  - Embed sync maintainability refactor.
  - Frontend operability closure for cancel/rollback/syncOptions/report.
  - Test stabilization and stronger contract coverage.
  - Docs alignment (API/ops/frontend usage).
- Out of scope:
  - Security isolation model hardening (explicitly deferred).
  - Storage backend migration.
  - New adapter families beyond current geogebra/phet/custom profile.

## Approach Options

1. Patch-only (fast, no refactor)
   - Pros: lowest short-term risk.
   - Cons: complexity debt remains (`embedProfileSync.js` and `normalizers.js` stay oversized), future changes keep getting expensive.
2. Balanced extraction (recommended)
   - Pros: keeps behavior stable while reducing risk concentration; supports incremental commits and easier rollbacks.
   - Cons: medium implementation effort.
3. Full rewrite of sync engine
   - Pros: clean architecture from scratch.
   - Cons: highest regression risk, too much scope for current target.

Recommendation: **Option 2 (Balanced extraction)**.

## Acceptance Gates

1. Core embed backend tests pass (service + route + resilience suites).
2. Frontend embed API/action tests pass.
3. `node scripts/check_file_line_budgets.js` passes without adding new broad overrides.
4. Docs updated and docs contract tests pass.
5. Regression `tests/library-embed-profile-cleanup.test.js` is deterministic and green.

---

### Task 1: Stabilize Current Regression Baseline

**Files:**
- Modify: `tests/library-embed-profile-cleanup.test.js`
- Optional Modify (only if behavior bug confirmed): `server/services/library/embedProfilesService.js`

**Step 1: Write/adjust failing assertion to semantic contract**
- Keep required guarantees:
  - profile-level cleanup must happen on profile state write failure.
  - stale publish directories may be cleaned proactively and should not fail test.
- Remove brittle exact-count assertion if behavior is valid but expanded.

**Step 2: Run single failing test (RED first)**

Run: `node --test tests/library-embed-profile-cleanup.test.js`  
Expected: FAIL before fix with current mismatch (`3 !== 2`).

**Step 3: Apply minimal fix**
- Prefer test contract adjustment if behavior is correct.
- If behavior is wrong, patch service cleanup flow and keep semantic assertions.

**Step 4: Re-run to GREEN**

Run: `node --test tests/library-embed-profile-cleanup.test.js`  
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/library-embed-profile-cleanup.test.js server/services/library/embedProfilesService.js
git commit -m "test(embed): stabilize cleanup contract around mirrored release cleanup"
```

---

### Task 2: Extract Parser/Normalizer Hotspot (`core/normalizers`)

**Files:**
- Create: `server/services/library/core/parsers/htmlRefs.js`
- Create: `server/services/library/core/parsers/jsRefs.js`
- Create: `server/services/library/core/parsers/cssRefs.js`
- Create: `server/services/library/core/syncOptions.js`
- Modify: `server/services/library/core/normalizers.js`
- Add/Modify tests:
  - `tests/library-embed-sync-resilience.test.js`
  - `tests/library-normalizers-security.test.js`
  - Create: `tests/library-ref-parsers-contract.test.js`

**Step 1: Add failing parser contract tests**
- Cover existing tricky cases already seen in resilience tests:
  - inline `<style>` refs,
  - dynamic import with options,
  - CSS `url("bg(1).png")`,
  - `@import` chain behavior.

**Step 2: Run parser-focused tests (RED)**

Run:  
`node --test tests/library-ref-parsers-contract.test.js tests/library-normalizers-security.test.js`  
Expected: FAIL for new parser module expectations.

**Step 3: Implement extraction with zero behavior drift**
- Move parser logic into dedicated files.
- Keep `normalizers.js` as composition facade and compatibility exports.
- Keep proto-pollution sanitization intact.

**Step 4: Re-run parser + resilience tests (GREEN)**

Run:  
`node --test tests/library-ref-parsers-contract.test.js tests/library-embed-sync-resilience.test.js tests/library-normalizers-security.test.js`  
Expected: PASS.

**Step 5: Commit**

```bash
git add server/services/library/core/parsers server/services/library/core/syncOptions.js server/services/library/core/normalizers.js tests/library-ref-parsers-contract.test.js tests/library-embed-sync-resilience.test.js tests/library-normalizers-security.test.js
git commit -m "refactor(embed): extract ref parsers and sync option normalization"
```

---

### Task 3: Split `embedProfileSync` Into Focused Units

**Files:**
- Create:
  - `server/services/library/core/sync/constants.js`
  - `server/services/library/core/sync/errors.js`
  - `server/services/library/core/sync/fetchWithCache.js`
  - `server/services/library/core/sync/dependencyCrawler.js`
  - `server/services/library/core/sync/publishRelease.js`
  - `server/services/library/core/sync/report.js`
- Modify: `server/services/library/core/embedProfileSync.js`
- Modify/Add tests:
  - `tests/library-embed-sync-resilience.test.js`
  - `tests/library-sync-cleanup-errors.test.js`
  - Create: `tests/library-embed-sync-module-contract.test.js`

**Step 1: Add failing module contract tests**
- Verify exported orchestration API unchanged:
  - `syncEmbedProfile`,
  - `cancelEmbedProfileSync`,
  - status/report persistence behavior.

**Step 2: Run focused sync tests (RED)**

Run:  
`node --test tests/library-embed-sync-module-contract.test.js tests/library-embed-sync-resilience.test.js`  
Expected: FAIL before extraction wiring is complete.

**Step 3: Implement extraction**
- Preserve:
  - in-flight dedupe mutex,
  - retry/timeout/cancel semantics,
  - release-history pruning,
  - strict self-check behavior.
- Do not change route/service API signatures.

**Step 4: Re-run full sync suites (GREEN)**

Run:  
`node --test tests/library-embed-sync-resilience.test.js tests/library-sync-cleanup-errors.test.js tests/library-embed-profile-update-sync-state.test.js`  
Expected: PASS.

**Step 5: Commit**

```bash
git add server/services/library/core/sync server/services/library/core/embedProfileSync.js tests/library-embed-sync-module-contract.test.js tests/library-embed-sync-resilience.test.js tests/library-sync-cleanup-errors.test.js tests/library-embed-profile-update-sync-state.test.js
git commit -m "refactor(embed): split sync engine into crawler/fetch/publish/report modules"
```

---

### Task 4: Frontend API Contract Completion (Cancel/Rollback/SyncOptions)

**Files:**
- Modify: `frontend/src/features/library/libraryApi.ts`
- Modify: `frontend/src/features/library/libraryApiPayloads.ts`
- Modify: `frontend/src/features/library/types.ts`
- Modify: `frontend/src/features/library/libraryApiMappers.ts`
- Modify tests:
  - `frontend/test/library-api.test.ts`
  - `frontend/test/library-api-mappers-robustness.test.ts`

**Step 1: Write failing frontend API tests**
- `cancelLibraryEmbedProfileSync(profileId)` -> `POST /sync/cancel`
- `rollbackLibraryEmbedProfile(profileId)` -> `POST /rollback`
- create/update payload should include optional `syncOptions`.

**Step 2: Run frontend API tests (RED)**

Run (frontend dir):  
`npm run test -- frontend/test/library-api.test.ts frontend/test/library-api-mappers-robustness.test.ts`  
Expected: FAIL for missing functions/fields.

**Step 3: Implement minimal client + payload support**
- Add API methods.
- Add `syncOptions` to payload types/builders.
- Map/report new profile fields safely.

**Step 4: Re-run frontend API tests (GREEN)**

Run (frontend dir):  
`npm run test -- frontend/test/library-api.test.ts frontend/test/library-api-mappers-robustness.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/features/library/libraryApi.ts frontend/src/features/library/libraryApiPayloads.ts frontend/src/features/library/types.ts frontend/src/features/library/libraryApiMappers.ts frontend/test/library-api.test.ts frontend/test/library-api-mappers-robustness.test.ts
git commit -m "feat(embed-ui): complete frontend api contract for cancel rollback and sync options"
```

---

### Task 5: Admin Embed UI Operability Closure

**Files:**
- Modify: `frontend/src/features/library/useLibraryAdminDraftState.ts`
- Modify: `frontend/src/features/library/embedProfile/embedProfileActionDeps.ts`
- Modify: `frontend/src/features/library/embedProfile/useEmbedProfileCreateActions.ts`
- Modify: `frontend/src/features/library/embedProfile/useEmbedProfileEditActions.ts`
- Modify: `frontend/src/features/library/embedProfile/useEmbedProfileSyncActions.ts`
- Modify: `frontend/src/views/admin/library/AdminLibraryView.template.html`
- Modify: `frontend/src/views/admin/library/panels/EmbedProfileCreatePanel.vue`
- Modify: `frontend/src/views/admin/library/panels/EmbedProfileEditPanel.vue`
- Modify tests:
  - `frontend/test/library-embed-profile-actions-split.test.ts`
  - Create: `frontend/test/library-embed-profile-operations.test.ts`

**Step 1: Add failing UI/action tests**
- New actions exposed and wired:
  - cancel sync,
  - rollback release.
- Create/edit forms can edit `syncOptions`.
- List panel shows report summary (`retryCount/errors/unresolvedCount`).

**Step 2: Run frontend action tests (RED)**

Run (frontend dir):  
`npm run test -- frontend/test/library-embed-profile-actions-split.test.ts frontend/test/library-embed-profile-operations.test.ts`  
Expected: FAIL for missing methods/fields.

**Step 3: Implement minimal UI/action changes**
- Add draft fields for sync options.
- Add parse/validate numeric ranges client-side (same bounds as backend schema).
- Add buttons and status/report rendering in embed list.

**Step 4: Re-run tests (GREEN)**

Run (frontend dir):  
`npm run test -- frontend/test/library-embed-profile-actions-split.test.ts frontend/test/library-embed-profile-operations.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/features/library/useLibraryAdminDraftState.ts frontend/src/features/library/embedProfile/embedProfileActionDeps.ts frontend/src/features/library/embedProfile/useEmbedProfileCreateActions.ts frontend/src/features/library/embedProfile/useEmbedProfileEditActions.ts frontend/src/features/library/embedProfile/useEmbedProfileSyncActions.ts frontend/src/views/admin/library/AdminLibraryView.template.html frontend/src/views/admin/library/panels/EmbedProfileCreatePanel.vue frontend/src/views/admin/library/panels/EmbedProfileEditPanel.vue frontend/test/library-embed-profile-actions-split.test.ts frontend/test/library-embed-profile-operations.test.ts
git commit -m "feat(embed-ui): add sync cancel rollback and sync-options controls"
```

---

### Task 6: Enforce Maintainability Gates (Line Budget Green)

**Files:**
- Modify (if needed): extracted sync/parser files from Tasks 2-3
- Optional Modify: `tests/library-route-size.test.js` (only if guard policy changed intentionally)

**Step 1: Run line budget guard**

Run: `node scripts/check_file_line_budgets.js`  
Expected now: either PASS, or explicit list of remaining oversized files.

**Step 2: If still failing, continue extraction**
- Keep each module under budget.
- Avoid adding blanket overrides unless strongly justified.

**Step 3: Re-run guard to GREEN**

Run: `node scripts/check_file_line_budgets.js`  
Expected: PASS.

**Step 4: Commit**

```bash
git add server/services/library/core tests
git commit -m "refactor(embed): satisfy file line budgets for sync and parser modules"
```

---

### Task 7: Docs And Runbook Alignment

**Files:**
- Modify: `docs/guides/api.md`
- Modify: `docs/guides/ops-library-incident-runbook.md`
- Modify: `docs/guides/spa-and-frontend.md`
- Modify/Add tests:
  - `tests/library-docs-contract.test.js`
  - `tests/docs-guides-contract-guard.test.js`

**Step 1: Add/adjust docs contract tests (RED if missing refs)**
- Validate docs mention:
  - cancel/rollback operations,
  - `syncOptions` payload usage,
  - `syncLastReport` troubleshooting.

**Step 2: Update docs**
- API request/response examples.
- Admin UI operation guidance.
- Incident handling flow with report-first diagnosis.

**Step 3: Run docs tests (GREEN)**

Run:  
`node --test tests/library-docs-contract.test.js tests/docs-guides-contract-guard.test.js tests/ops-docs.test.js`  
Expected: PASS.

**Step 4: Commit**

```bash
git add docs/guides/api.md docs/guides/ops-library-incident-runbook.md docs/guides/spa-and-frontend.md tests/library-docs-contract.test.js tests/docs-guides-contract-guard.test.js
git commit -m "docs(embed): align api ops and frontend guides with phase2 operability"
```

---

### Task 8: End-To-End Verification And Release Readiness

**Files:**
- No new code required unless failures found.

**Step 1: Run backend embed suites**

Run:  
`node --test tests/library-service.test.js tests/library-service-lifecycle.test.js tests/library-embed-sync-resilience.test.js tests/library-route-api.test.js tests/library-route-api-lifecycle.test.js tests/library-sync-cleanup-errors.test.js tests/library-embed-profile-cleanup.test.js tests/library-embed-profile-update-sync-state.test.js`

Expected: PASS.

**Step 2: Run frontend embed suites (if deps installed)**

Run (frontend dir):  
`npm run test -- frontend/test/library-api.test.ts frontend/test/library-api-mappers-robustness.test.ts frontend/test/library-embed-profile-actions-split.test.ts frontend/test/library-embed-profile-operations.test.ts`

Expected: PASS.

**Step 3: Run maintainability + docs gates**

Run:  
`node scripts/check_file_line_budgets.js`  
`node --test tests/library-docs-contract.test.js tests/docs-guides-contract-guard.test.js tests/ops-docs.test.js`

Expected: PASS.

**Step 4: Final commit (only if any remaining verification-fix changes)**

```bash
git add -A
git commit -m "chore(embed): final verification fixes and release readiness"
```

---

## Completion Definition

- Embed admin can create/update profile with sync options, manually sync, cancel in-flight sync, rollback release, and inspect last sync report quickly.
- Backend sync internals are split into maintainable modules without changing public API behavior.
- Core embed tests, docs tests, and file budget guard are all green.
- No new compatibility debt introduced.

