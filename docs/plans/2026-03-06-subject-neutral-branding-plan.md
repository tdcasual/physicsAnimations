# Subject-Neutral Branding Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify outward-facing naming around “学科演示集” and remove physics-specific wording from visible copy and documentation across the repository, without renaming technical identifiers like repo/package/image ids.

**Architecture:** Treat this as a layered copy cleanup. First find all visible UI and documentation strings that still imply a single-subject scope, then protect the intended naming with source-guard tests, then update docs and user-facing text while preserving internal ids and compatibility-sensitive technical labels.

**Tech Stack:** Vue 3 source files, Markdown docs, Vitest source-guard tests, existing `qa:release` verification gate.

---

### Task 1: Inventory brand and scope wording

**Files:**
- Inspect: `frontend/src/**`
- Inspect: `docs/**`
- Inspect: `README.md`
- Inspect: `tests/**` and `frontend/test/**` where wording guards exist

**Step 1: Search for physics-specific or old brand wording**

Run repo-wide searches for legacy branding and scope wording, then classify each hit as user-facing copy or technical identifier.

**Step 2: Classify hits**

Keep:
- internal route/data ids like `physics`
- repo/package/image identifiers unless they are documentation-facing branding

Change:
- visible UI copy
- README/docs wording
- current plan docs when they describe the product scope

### Task 2: Add copy guard tests

**Files:**
- Create/Modify: `frontend/test/subject-neutral-copy.test.ts`
- Create: `tests/subject-neutral-docs.test.js`

**Step 1: Write failing tests**

Assert that:
- visible app shell/catalog fallback/library fallback copy uses `学科`
- README and docs do not describe the product as single-subject only
- docs use `学科演示集` as the outward-facing product label where appropriate

**Step 2: Run tests to verify failure**

Run targeted frontend/node tests for the new guards.

### Task 3: Update visible copy and documentation

**Files:**
- Modify visible UI copy files found in Task 1
- Modify: `README.md`
- Modify: `docs/**`
- Modify relevant current `docs/plans/**` where the scope wording is now inaccurate

**Step 1: Replace legacy single-subject user-facing wording**

Use `学科` / `学科演示集` / `课堂演示与资源` consistently.

**Step 2: Preserve technical identifiers**

Do not rename repo path, package name, image coordinates, or code ids unless they are purely descriptive text.

**Step 3: Update tests if copy contracts changed intentionally**

Keep tests aligned with the new neutral naming.

### Task 4: Verify and record

**Step 1: Run targeted guards**

Run targeted frontend and node tests for the new copy contracts.

**Step 2: Run full verification**

Run: `npm run qa:release`

**Step 3: Record skill usage**

Append a skill audit entry summarizing the branding cleanup.
