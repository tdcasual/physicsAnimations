# Embed Mirror Resilience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver embed mirror robustness upgrades across atomic publish, offline self-check, configurable limits, concurrency, observability report, incremental cache reuse, and expanded ref parsing.

**Architecture:** Keep existing library service API unchanged while upgrading `embedProfileSync` internals to a release-based publish model and richer sync pipeline. Extend profile state schema to persist sync options/report/cache metadata. Verify behavior with focused backend tests first (red), then minimal implementation updates (green), followed by regression passes.

**Tech Stack:** Node.js, in-repo test runner (`node --test`), Express service modules, JSON-backed state store.

---

### Task 1: Add failing tests for 1-7 requirements

**Files:**
- Modify: `tests/library-service.test.js`

**Step 1: Write failing tests**
- Atomic release behavior under failed resync (previous release remains usable).
- Offline self-check failure when same-origin local ref remains unresolved.
- Sync options enforcement (`maxFiles`, `maxTotalBytes`, `maxFileBytes`).
- Concurrency effect (`maxObservedInFlight > 1` when configured).
- Sync report fields present and meaningful.
- Incremental cache reuse via conditional requests / reused-count.
- Extended parser coverage for inline style `<style>` refs.

**Step 2: Run test to verify RED**
Run: `node --test tests/library-service.test.js`
Expected: FAIL in new tests with missing behavior.

### Task 2: Implement parser coverage enhancements

**Files:**
- Modify: `server/services/library/core/normalizers.js`

**Step 1: Implement minimal parser additions**
- Add inline-style extractor for `<style>...</style>` and `style="..."` URLs.
- Ensure CSS parser handles `@import` + `url()` comprehensively.
- Export new helper(s) for sync pipeline usage.

**Step 2: Run targeted tests**
Run: `node --test tests/library-service.test.js`
Expected: parser-related test progress (some still failing for pipeline features).

### Task 3: Implement release-based atomic publish + options + concurrency + cache + report

**Files:**
- Modify: `server/services/library/core/embedProfileSync.js`

**Step 1: Atomic publish**
- Write mirrored assets to release-scoped prefix (`releases/<releaseId>`).
- Publish by updating profile script/viewer paths after full write success.
- Keep release history and prune stale releases with bounded retention.

**Step 2: Configurable limits & profile overrides**
- Read defaults from env.
- Merge with per-profile `syncOptions`.
- Enforce max file count / per-file bytes / total bytes / timeout / concurrency.

**Step 3: Concurrency**
- Replace sequential fetch loop with bounded parallel worker loop.

**Step 4: Incremental cache**
- Add conditional request support (`If-None-Match`, `If-Modified-Since`).
- Reuse previous release files for 304 responses.

**Step 5: Offline self-check**
- Validate rewritten bundle local refs are resolvable post-mirror.
- Fail sync when strict check enabled and unresolved local refs remain.

**Step 6: Sync report**
- Build structured sync report (counts, bytes, timing, skipped reasons, reuse stats).

### Task 4: Persist new profile metadata fields

**Files:**
- Modify: `server/services/library/embedProfilesService.js`
- Modify: `server/lib/libraryState/normalizers.js`

**Step 1: Profile sync options and metadata persistence**
- Accept/store `syncOptions` in create/update profile flows.
- Persist `activeReleaseId`, `releaseHistory`, `syncCache`, `syncLastReport` safely.

**Step 2: Keep backward compatibility**
- Ensure missing fields default safely for existing state files.

### Task 5: Update API validation + frontend typing/mapping

**Files:**
- Modify: `server/routes/library.js`
- Modify: `frontend/src/features/library/types.ts`
- Modify: `frontend/src/features/library/libraryApiMappers.ts`

**Step 1: Add `syncOptions` schema in create/update embed profile payloads**

**Step 2: Extend frontend types/mappers for new optional report fields**

### Task 6: Verify GREEN + regressions

**Files:**
- No new files

**Step 1: Run focused sync tests**
Run: `node --test tests/library-service.test.js`
Expected: PASS.

**Step 2: Run related lifecycle regressions**
Run: `node --test tests/library-service-lifecycle.test.js tests/library-sync-cleanup-errors.test.js`
Expected: PASS.

**Step 3: Summarize behavior and remaining tradeoffs**
- Note retained non-goals (security isolation unchanged).
- Report test evidence and any residual limitations.
