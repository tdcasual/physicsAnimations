# Tech Debt Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the current maintainability and ops debt without changing user-facing behavior, and make debt regression visible in CI/release gates.

**Architecture:** Run a staged remediation: first fix contract drift and release gate blind spots, then split size-critical frontend modules, then close observability and E2E gaps. Keep behavior stable with contract tests and small commits.

**Tech Stack:** Node.js (Express), Vue 3 + TypeScript, Node test runner (`node --test`), Vitest, Playwright Chromium.

---

### Task 1: Freeze Baseline and Debt Signals

**Files:**
- Modify: `docs/guides/continuous-improvement-roadmap.md`

**Step 1: Capture current baseline outputs**
- Run:
  - `npm run qa:release`
  - `npm run guard:file-size`
  - `npm run guard:security`
  - `npm audit --omit=dev --json`
  - `npm --prefix frontend audit --omit=dev --json`

**Step 2: Update roadmap baseline section**
- Add execution date, command set, and measured hotspots (top line-budget files).
- Keep one source of truth in roadmap to avoid hidden spreadsheet debt.

**Step 3: Verify no behavior changes**
- Run: `node --test tests/ops-docs.test.js tests/file-line-budgets.test.js`

**Step 4: Commit**
- `git add docs/guides/continuous-improvement-roadmap.md`
- `git commit -m "docs(roadmap): refresh debt baseline and verification evidence"`

### Task 2: Fix Contract Drift (STATE_DB default)

**Files:**
- Add: `tests/configuration-doc-state-db-default.test.js`
- Modify: `docs/guides/configuration.md`
- Modify: `docs/guides/deployment.md`

**Step 1: Write failing doc contract test (RED)**
- New assertions must enforce:
  - docs describe default runtime behavior (`STATE_DB_MODE` default sqlite in app runtime path),
  - docs explain explicit override if operators want `off`.

**Step 2: Run targeted tests (expect RED)**
- `node --test tests/configuration-doc-state-db-default.test.js`

**Step 3: Minimal documentation fix**
- Align wording with runtime behavior and add migration note for operators relying on old docs.

**Step 4: Re-run tests (expect GREEN)**
- `node --test tests/configuration-doc-state-db-default.test.js tests/configuration-doc-storage-mode.test.js tests/ops-docs.test.js`

**Step 5: Commit**
- `git add tests/configuration-doc-state-db-default.test.js docs/guides/configuration.md docs/guides/deployment.md`
- `git commit -m "docs(config): align state db defaults with runtime contract"`

### Task 3: Upgrade Release Gate from Pattern Checks to Dependency Risk Checks

**Files:**
- Add: `scripts/check_audit_high_critical.js`
- Modify: `package.json`
- Modify: `scripts/qa_release_gate.sh`
- Modify: `tests/qa-release-gate.test.js`
- Modify: `docs/guides/ops-release-runbook.md`

**Step 1: Write failing gate test (RED)**
- Extend `qa-release-gate` test to require `guard:audit` in the release script.

**Step 2: Run targeted test (expect RED)**
- `node --test tests/qa-release-gate.test.js`

**Step 3: Minimal implementation**
- Add `guard:audit` script:
  - run root + frontend `npm audit --omit=dev --json`,
  - fail only when `high + critical > 0`,
  - print compact summary for CI logs.
- Add `npm run guard:audit` to `qa_release_gate.sh`.
- Update runbook checklist to include dependency risk gate.

**Step 4: Re-run tests (expect GREEN)**
- `node --test tests/qa-release-gate.test.js tests/ops-docs.test.js`
- `npm run guard:audit`

**Step 5: Commit**
- `git add scripts/check_audit_high_critical.js package.json scripts/qa_release_gate.sh tests/qa-release-gate.test.js docs/guides/ops-release-runbook.md`
- `git commit -m "chore(gate): add high/critical dependency audit guard"`

### Task 4: Defuse Frontend Size Redline Files

**Files:**
- Modify: `frontend/src/features/library/useLibraryAdminState.ts`
- Add: `frontend/src/features/library/useLibraryAdminStateFacade.ts`
- Modify: `frontend/src/features/admin/taxonomy/useTaxonomyAdmin.ts`
- Add: `frontend/src/features/admin/taxonomy/useTaxonomyAdminLifecycle.ts`
- Modify: `frontend/src/views/CatalogView.vue`
- Add: `frontend/src/features/catalog/useCatalogViewState.ts`
- Add: `frontend/test/catalog-view-size.test.ts`
- Modify: `frontend/test/library-admin-state-size.test.ts`
- Modify: `frontend/test/taxonomy-admin-state-size.test.ts`
- Modify: `config/file-line-budgets.json`

**Step 1: Write/adjust failing size and behavior tests (RED)**
- Tighten target caps:
  - `useLibraryAdminState.ts <= 420`
  - `CatalogView.vue <= 340`
  - `useTaxonomyAdmin.ts <= 330`
- Keep behavior tests unchanged to guard against functional drift.

**Step 2: Run targeted tests (expect RED)**
- `npm --prefix frontend run test -- library-admin-state-size taxonomy-admin-state-size catalog-view-size --run`

**Step 3: Minimal extraction refactor**
- Move orchestration-only logic into new facade/lifecycle composables.
- Keep current exports and call sites stable.
- Do not change API contracts.

**Step 4: Re-run targeted tests (expect GREEN)**
- `npm --prefix frontend run test -- library-admin-state-size taxonomy-admin-state-size catalog-view-size --run`
- `npm run guard:file-size`

**Step 5: Run broader frontend safety checks**
- `npm --prefix frontend run test -- --run`
- `npm run typecheck:frontend`

**Step 6: Commit**
- `git add frontend/src/features/library/useLibraryAdminState.ts frontend/src/features/library/useLibraryAdminStateFacade.ts frontend/src/features/admin/taxonomy/useTaxonomyAdmin.ts frontend/src/features/admin/taxonomy/useTaxonomyAdminLifecycle.ts frontend/src/views/CatalogView.vue frontend/src/features/catalog/useCatalogViewState.ts frontend/test/catalog-view-size.test.ts frontend/test/library-admin-state-size.test.ts frontend/test/taxonomy-admin-state-size.test.ts config/file-line-budgets.json`
- `git commit -m "refactor(frontend): split redline modules and tighten size budgets"`

### Task 5: Close Observability Loop (Thresholds + Actions)

**Files:**
- Add: `docs/guides/ops-observability-thresholds.md`
- Modify: `docs/guides/ops-release-runbook.md`
- Modify: `docs/README.md`
- Modify: `README.md`
- Modify: `tests/ops-docs.test.js`

**Step 1: Write failing docs test (RED)**
- Require observability threshold doc link in docs index + root README.
- Require release runbook to mention p95/5xx thresholds and escalation steps.

**Step 2: Run targeted tests (expect RED)**
- `node --test tests/ops-docs.test.js`

**Step 3: Minimal docs implementation**
- Define thresholds using current roadmap metrics fields:
  - latency p95 threshold per endpoint class,
  - 5xx rate threshold,
  - immediate actions (rollback / circuit-break / disable risky path / notify).

**Step 4: Re-run tests (expect GREEN)**
- `node --test tests/ops-docs.test.js`

**Step 5: Commit**
- `git add docs/guides/ops-observability-thresholds.md docs/guides/ops-release-runbook.md docs/README.md README.md tests/ops-docs.test.js`
- `git commit -m "docs(ops): add metrics thresholds and incident actions"`

### Task 6: Add Deterministic UI E2E for Admin Write Path

**Files:**
- Add: `tests/e2e-admin-writepath.test.js`
- Modify: `package.json`
- Modify: `scripts/qa_release_gate.sh`

**Step 1: Write failing E2E test (RED)**
- Create one deterministic browser flow:
  - admin login,
  - create content,
  - verify list visibility,
  - cleanup created item.
- Fail on console errors and 5xx network responses.

**Step 2: Run targeted test (expect RED initially)**
- `node --test tests/e2e-admin-writepath.test.js`

**Step 3: Minimal implementation**
- Reuse existing smoke helper patterns where possible.
- Expose a single npm script (`test:e2e:admin-write`) for local + CI.

**Step 4: Re-run tests (expect GREEN)**
- `node --test tests/e2e-admin-writepath.test.js`
- `npm run smoke:spa-admin-write`

**Step 5: Integrate into release gate**
- Add `npm run test:e2e:admin-write` before smoke scripts.

**Step 6: Commit**
- `git add tests/e2e-admin-writepath.test.js package.json scripts/qa_release_gate.sh`
- `git commit -m "test(e2e): add deterministic admin write-path browser test"`

### Task 7: Final Verification and Rollout

**Files:**
- None (verification + release prep)

**Step 1: Full verification**
- `npm run qa:release`
- `npm test`
- `npm --prefix frontend run test -- --run`

**Step 2: Debt delta check**
- Confirm all 3 target frontend files are below new caps.
- Confirm `guard:audit` output is included in release logs.
- Confirm new observability doc links render from both readme indexes.

**Step 3: Commit final cleanups (if any)**
- `git add ...`
- `git commit -m "chore: finalize tech debt remediation phase"`

**Step 4: Push**
- `git push -u origin codex/tech-debt-remediation`
