# UI Responsive Phase1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不重做设计系统的前提下，修复当前移动端可读性/拥挤问题，确保“迁移文案清理”在构建产物中也生效，并建立首批响应式回归测试。

**Architecture:** 采用“测试先行 + 最小 CSS 改动”策略，不改动业务数据流与接口。以 `frontend/src/styles.css` 和各 Admin 页面 scoped style 为主要改造面，新增针对源码与 dist 文案的回归测试，最后做一次全量验证与截图复核。

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Node.js built-in test runner, Playwright CLI.

---

Related skills to use during execution: `@superpowers:test-driven-development`, `@superpowers:verification-before-completion`, `@skills:playwright`.

### Task 0: Prepare Isolated Worktree

**Files:**
- Create: `.worktrees/ui-responsive-phase1` (git worktree)

**Step 1: Create worktree branch**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations
git worktree add .worktrees/ui-responsive-phase1 -b codex/ui-responsive-phase1
```

Expected: new worktree created on branch `codex/ui-responsive-phase1`.

**Step 2: Install dependencies in worktree**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/ui-responsive-phase1
npm install
npm --prefix frontend install
```

Expected: dependency install completes without fatal error.

**Step 3: Record baseline test status**

Run:
```bash
npm --prefix frontend run test
node --test tests/spa-entry-routes.test.js
```

Expected: baseline is green before new changes.

---

### Task 1: Add Failing Test for Topbar Mobile Layout

**Files:**
- Create: `frontend/test/topbar-responsive.test.ts`
- Modify (later): `frontend/src/styles.css`

**Step 1: Write the failing test**

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("topbar responsive layout", () => {
  it("defines a mobile breakpoint that allows topbar wrapping", () => {
    const css = read("src/styles.css");
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
    expect(css).toMatch(/\.topbar-inner\s*\{[\s\S]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.actions\s*\{[\s\S]*flex-wrap:\s*wrap/);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd frontend
npm run test -- test/topbar-responsive.test.ts
```

Expected: FAIL (missing `@media (max-width: 480px)` rules in `src/styles.css`).

**Step 3: Write minimal implementation**

Modify `frontend/src/styles.css` by adding:

```css
@media (max-width: 480px) {
  .topbar-inner {
    width: calc(100% - 20px);
    padding: 10px 0;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
  }

  .actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .app-main {
    width: calc(100% - 20px);
    margin-top: 12px;
  }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd frontend
npm run test -- test/topbar-responsive.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/test/topbar-responsive.test.ts frontend/src/styles.css
git commit -m "test+fix(ui): add mobile topbar wrapping breakpoint"
```

---

### Task 2: Add Failing Test for Admin Content Mobile Wrapping

**Files:**
- Create: `frontend/test/admin-content-responsive.test.ts`
- Modify (later): `frontend/src/views/admin/AdminContentView.vue`

**Step 1: Write the failing test**

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin content responsive layout", () => {
  it("wraps item head and action row on narrow screens", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/admin/AdminContentView.vue"),
      "utf8",
    );
    expect(source).toMatch(/\.item-head\s*\{[\s\S]*flex-wrap:\s*wrap/);
    expect(source).toMatch(/\.item-actions\s*\{[\s\S]*flex-wrap:\s*wrap/);
    expect(source).toMatch(/\.list-header\s*\{[\s\S]*flex-wrap:\s*wrap/);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd frontend
npm run test -- test/admin-content-responsive.test.ts
```

Expected: FAIL (`.item-head` / `.item-actions` / `.list-header` missing wrap rules).

**Step 3: Write minimal implementation**

Update style block in `frontend/src/views/admin/AdminContentView.vue`:

```css
.list-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.item-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.item-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd frontend
npm run test -- test/admin-content-responsive.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/test/admin-content-responsive.test.ts frontend/src/views/admin/AdminContentView.vue
git commit -m "test+fix(admin): wrap content header/actions for narrow screens"
```

---

### Task 3: Add Failing Test for Admin System Long Text Wrapping

**Files:**
- Create: `frontend/test/admin-system-responsive.test.ts`
- Modify (later): `frontend/src/views/admin/AdminSystemView.vue`

**Step 1: Write the failing test**

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin system status readability", () => {
  it("allows long status values to wrap instead of overflowing", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/admin/AdminSystemView.vue"),
      "utf8",
    );
    expect(source).toMatch(/overflow-wrap:\s*anywhere/);
    expect(source).toMatch(/word-break:\s*break-word/);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd frontend
npm run test -- test/admin-system-responsive.test.ts
```

Expected: FAIL (`overflow-wrap` / `word-break` not found).

**Step 3: Write minimal implementation**

Add to `frontend/src/views/admin/AdminSystemView.vue` style block:

```css
.status-grid > div {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd frontend
npm run test -- test/admin-system-responsive.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/test/admin-system-responsive.test.ts frontend/src/views/admin/AdminSystemView.vue
git commit -m "test+fix(admin): wrap long system status values on mobile"
```

---

### Task 4: Add Failing Test for Dist Copy Consistency, Then Rebuild

**Files:**
- Create: `tests/frontend-dist-copy.test.js`
- Modify (build artifact): `frontend/dist/**`
- Verify source: `frontend/src/App.vue`

**Step 1: Write the failing dist consistency test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("frontend dist should not contain migration-in-progress copy", async () => {
  const distDir = path.join(__dirname, "..", "frontend", "dist");
  const files = [];

  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/\.(html|js|css)$/i.test(name)) files.push(full);
    }
  }

  walk(distDir);
  let hit = "";
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("迁移中")) {
      hit = file;
      break;
    }
  }
  assert.equal(hit, "", `found forbidden copy in dist: ${hit}`);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
node --test tests/frontend-dist-copy.test.js
```

Expected: FAIL (old dist still contains `迁移中` copy).

**Step 3: Write minimal implementation**

Run:
```bash
npm --prefix frontend run build
```

Expected: dist regenerated from latest source (`frontend/src/App.vue`).

**Step 4: Run test to verify it passes**

Run:
```bash
node --test tests/frontend-dist-copy.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add tests/frontend-dist-copy.test.js frontend/dist
git commit -m "test+build(frontend): refresh dist and verify migration copy removed"
```

---

### Task 5: Full Verification and Evidence Snapshot

**Files:**
- Evidence output: `output/playwright/responsive-audit/*`

**Step 1: Run all frontend tests**

Run:
```bash
npm --prefix frontend run test
```

Expected: PASS (all tests green, including new responsive tests).

**Step 2: Run backend SPA route regression**

Run:
```bash
node --test tests/spa-entry-routes.test.js
```

Expected: PASS.

**Step 3: Capture responsive screenshots with Playwright CLI**

Run:
```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
mkdir -p output/playwright/responsive-audit

"$PWCLI" open http://127.0.0.1:4173/
"$PWCLI" resize 320 568
"$PWCLI" screenshot
"$PWCLI" resize 390 844
"$PWCLI" screenshot
"$PWCLI" resize 1440 900
"$PWCLI" screenshot
```

Expected: screenshots produced; manually verify no critical overflow, controls reachable.

**Step 4: Final commit for any verification helper changes (if any)**

```bash
git add output/playwright/responsive-audit
git commit -m "chore(ui): attach responsive audit evidence"
```

If team policy does not store screenshots in git, skip this commit and keep artifacts local only.

---

### Non-Goals (This Plan Does Not Include)

1. 全站视觉重设计（字体体系、品牌重塑、组件库替换）。
2. 大范围 DOM 结构重写或路由信息架构调整。
3. 新增复杂 e2e 框架（只用现有 Playwright CLI 流程做审计复核）。

---

### Rollback Plan

1. 若某项改动引起布局回归，按任务粒度 `git revert <commit>` 回退。
2. 若 `frontend/dist` 体积变动过大，保留测试文件，回退构建产物提交，再单独讨论 dist 是否入库策略。
3. 若移动端修复影响桌面布局，优先加断点覆盖而不是删除基础样式。

---

Plan complete and saved to `docs/plans/2026-02-26-ui-responsive-phase1-implementation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
