# API Performance Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a deterministic backend API performance benchmark test for scale B, with configurable runs and optional latency thresholds.

**Architecture:** A single `node:test` file builds a deterministic dataset in a temp root, starts the Express app via `createApp`, runs HTTP requests against key endpoints, computes latency stats (avg/p50/p95/max) and payload sizes, and prints a summary. Optional env vars control scale and assertions.

**Tech Stack:** Node.js `node:test`, `node:perf_hooks`, existing Express app (`server/app.js`).

---

### Task 1: Add perf test scaffold (failing test)

**Files:**
- Create: `tests/perf-api.test.js`

**Step 1: Write the failing test**

Create `tests/perf-api.test.js` with a stubbed data generator and a minimal test that asserts expected counts (e.g., items === 2000) so it fails initially.

```js
const test = require("node:test");
const assert = require("node:assert/strict");

function buildFixture() {
  return { items: [], categories: [], groups: [] };
}

test("perf fixture matches scale B", () => {
  const fixture = buildFixture();
  assert.equal(fixture.items.length, 2000);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/perf-api.test.js`

Expected: FAIL with assertion error on item count.

**Step 3: Write minimal implementation**

Implement `buildFixture()` to return arrays sized for scale B (2000 items, 80 categories, 5 groups), keeping it deterministic via a seeded RNG.

**Step 4: Run test to verify it passes**

Run: `node --test tests/perf-api.test.js`

Expected: PASS for the fixture size assertion.

**Step 5: Commit**

```bash
git add tests/perf-api.test.js
git commit -m "test: scaffold API perf fixture"
```

---

### Task 2: Implement HTTP benchmark harness

**Files:**
- Modify: `tests/perf-api.test.js`

**Step 1: Write the failing test**

Extend the test to:
- write `animations.json`, `content/items.json`, `content/categories.json` into a temp root
- start the server with `createApp`
- hit `/api/catalog` once and expect a 200

This should fail until server setup and file writes are wired.

**Step 2: Run test to verify it fails**

Run: `node --test tests/perf-api.test.js`

Expected: FAIL due to missing temp root or server setup.

**Step 3: Write minimal implementation**

Implement helper functions in the same test file:
- `makeTempRoot()` (mirrors existing tests)
- `writeFixture(rootDir, fixture)`
- `startServer(app)` / `stopServer(server)`
- `fetchJson(baseUrl, path)` with status checks

Use `createApp({ rootDir, authConfig })` with deterministic auth config (same pattern as existing tests) to allow `/api/items` access if needed later.

**Step 4: Run test to verify it passes**

Run: `node --test tests/perf-api.test.js`

Expected: PASS for the single 200 response check.

**Step 5: Commit**

```bash
git add tests/perf-api.test.js
git commit -m "test: add perf harness server setup"
```

---

### Task 3: Add benchmark runs + stats + optional thresholds

**Files:**
- Modify: `tests/perf-api.test.js`

**Step 1: Write the failing test**

Extend the test to:
- run warm-up loops
- time N requests per endpoint
- compute avg/p50/p95/max + payload bytes
- optionally assert thresholds if env vars are set

Initially, return placeholder stats so assertions fail.

**Step 2: Run test to verify it fails**

Run: `node --test tests/perf-api.test.js`

Expected: FAIL due to missing stats computation or assertions.

**Step 3: Write minimal implementation**

Implement:
- `nowMs()` using `performance.now()`
- `percentile()` and `summarize()`
- `runBenchmark()` to return `{ name, runs, bytes }`
- stdout logging with clear `[perf]` prefix

Endpoints to cover:
- `/api/catalog`
- `/api/categories`
- `/api/items?page=1&pageSize=24`
- `/api/items?page=1&pageSize=24&type=link`
- `/api/items?page=1&pageSize=24&q=term`

Env vars:
- `PERF_RUNS` (default 8)
- `PERF_WARMUP` (default 2)
- `PERF_ASSERT_P95_MS` / `PERF_ASSERT_AVG_MS`
- `PERF_ITEMS`, `PERF_CATEGORIES`, `PERF_GROUPS` (optional overrides)

**Step 4: Run test to verify it passes**

Run: `node --test tests/perf-api.test.js`

Expected: PASS, with perf summary lines in output.

**Step 5: Commit**

```bash
git add tests/perf-api.test.js
git commit -m "test: add API performance benchmarks"
```

---

### Task 4: Full test run

**Files:**
- None

**Step 1: Run full test suite**

Run: `npm test`

Expected: All tests pass (including perf test).

**Step 2: Commit (if needed)**

If any new adjustments were made during this task:

```bash
git add tests/perf-api.test.js
git commit -m "test: stabilize perf benchmark"
```

---

## Notes
- Keep the perf test deterministic and fast (<10s default). If runtime becomes too long, reduce default runs or skip some endpoints.
- Do not fail the test by default on latency; only enforce thresholds when env vars are set.

