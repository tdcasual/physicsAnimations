# Quality 9+ Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将项目综合质量从当前约 8.2 提升到 9+，第一阶段优先完成“可回归稳定性 + 管理端关键可用性 + 可运维交接”三条主线。

**Architecture:** 在现有 Node/Express + Vue SPA 架构上，新增一层“发布前质量闸门”与“关键流程自动化回归”，避免回归靠人工发现。前端保持现有信息结构不推翻，仅做可用性增强与并发/错误处理补强。运维侧通过标准 Runbook 与演练脚本固化恢复路径，保证容器场景可交接。

**Tech Stack:** Node.js, Express, Vue 3, TypeScript, Vitest, node:test, playwright-chromium, shell scripts, Markdown docs。

---

## Scope and Success Criteria

- 回归覆盖：新增至少 2 条库管理端到端 smoke（资源上传/删除/恢复/永久删除，快速切换文件夹稳定性）。
- 发布闸门：形成单命令质量检查（后端测试 + 前端测试 + 构建 + 关键 smoke）。
- 管理端体验：完成一轮低风险 UX 提升（状态可见性、批量操作反馈、危险操作确认文案）。
- 运维交接：补齐发布、回滚、故障排查文档，并完成一次本地演练记录。

---

### Task 1: Add Release Quality Gate Command

**Files:**
- Create: `scripts/qa_release_gate.sh`
- Modify: `package.json`
- Test: `tests/qa-release-gate.test.js`

**Step 1: Write the failing test**

```js
// tests/qa-release-gate.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('qa gate script includes required verification commands', () => {
  const script = fs.readFileSync('scripts/qa_release_gate.sh', 'utf8');
  assert.match(script, /npm test/);
  assert.match(script, /npm --prefix frontend run test/);
  assert.match(script, /npm run build:frontend/);
  assert.match(script, /npm run smoke:spa-admin/);
  assert.match(script, /npm run smoke:spa-public/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/qa-release-gate.test.js`
Expected: FAIL (`scripts/qa_release_gate.sh` not found)

**Step 3: Write minimal implementation**

```bash
#!/usr/bin/env bash
set -euo pipefail
npm test
npm --prefix frontend run test
npm run build:frontend
npm run smoke:spa-public
npm run smoke:spa-admin
npm run smoke:spa-admin-write
```

Update `package.json`:

```json
{
  "scripts": {
    "qa:release": "bash ./scripts/qa_release_gate.sh"
  }
}
```

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/qa-release-gate.test.js`
- `npm run qa:release`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/qa_release_gate.sh package.json tests/qa-release-gate.test.js
git commit -m "chore(qa): add release quality gate command"
```

---

### Task 2: Add Library Admin End-to-End Smoke (CRUD + Trash + Permanent Delete)

**Files:**
- Create: `scripts/smoke_spa_library_admin.js`
- Modify: `package.json`
- Test: `tests/library-smoke-script.test.js`

**Step 1: Write the failing test**

```js
// tests/library-smoke-script.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('library smoke script covers upload/delete/restore/permanent delete', () => {
  const source = fs.readFileSync('scripts/smoke_spa_library_admin.js', 'utf8');
  assert.match(source, /\/admin\/library/);
  assert.match(source, /delete/i);
  assert.match(source, /restore/i);
  assert.match(source, /permanent/i);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/library-smoke-script.test.js`
Expected: FAIL (script missing)

**Step 3: Write minimal implementation**

- 复用 `scripts/smoke_spa_admin_writepath.js` 的 server 启停、health wait、console/page error 收集。
- 在 `/admin/library` 执行：
1. 创建文件夹
2. 上传一个 `.ggb`
3. 执行删除（软删）
4. 执行恢复
5. 再删除并执行永久删除
6. 断言删除列表为空
- 截图输出到 `output/playwright/spa-library-admin-smoke.png`

`package.json` 增加：

```json
{
  "scripts": {
    "smoke:spa-library-admin": "node scripts/smoke_spa_library_admin.js"
  }
}
```

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/library-smoke-script.test.js`
- `npm run smoke:spa-library-admin`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/smoke_spa_library_admin.js package.json tests/library-smoke-script.test.js
git commit -m "test(smoke): add library admin lifecycle smoke"
```

---

### Task 3: Add Regression for Rapid Folder Switching Stability

**Files:**
- Modify: `frontend/src/views/admin/AdminLibraryView.vue`
- Modify: `frontend/test/library-admin-layout.test.ts`
- Optional Create: `scripts/smoke_spa_library_race.js`

**Step 1: Write the failing test**

在 `frontend/test/library-admin-layout.test.ts` 增加断言：

```ts
expect(source).toMatch(/folderAssetsLoadSeq/);
expect(source).toMatch(/requestId !== folderAssetsLoadSeq\.value/);
expect(source).toMatch(/selectedFolderId\.value !== folderId/);
```

若尚未有 `smoke_spa_library_race.js`，额外断言脚本包含快速切换逻辑关键字（如 `for ... click` + `waitForResponse`）。

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- test/library-admin-layout.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

- 确保 `reloadFolderAssets` 使用请求序号防竞态。
- `watch(selectedFolderId)` 对异步加载使用安全兜底。
- 若添加 race smoke：自动快速切换多个文件夹并断言最后选中项与列表一致。

**Step 4: Run test to verify it passes**

Run:
- `npm --prefix frontend run test -- test/library-admin-layout.test.ts`
- `npm run smoke:spa-library-admin`（若 race 合并到同一脚本）
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/views/admin/AdminLibraryView.vue frontend/test/library-admin-layout.test.ts scripts/smoke_spa_library_race.js package.json
git commit -m "fix(admin-library): harden folder switch race handling"
```

---

### Task 4: Improve Admin Library UX Without Breaking Flows

**Files:**
- Modify: `frontend/src/views/admin/AdminLibraryView.vue`
- Test: `frontend/test/library-admin-layout.test.ts`
- Optional Test: `frontend/test/admin-style-semantics.test.ts`

**Step 1: Write the failing test**

为以下能力加静态断言（先写测试）：
- 批量工具条状态文案（成功/失败统计）
- 危险操作确认文案明确不可恢复后果（永久删除）
- 最近操作日志支持快速筛选与清空

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- test/library-admin-layout.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

- 优化文案与操作反馈（不改 API 结构）。
- 永久删除按钮显式标红，二次确认增加资源名。
- 提升 1080p 投屏可读性：关键按钮/状态对比度、字号、间距。

**Step 4: Run test to verify it passes**

Run:
- `npm --prefix frontend run test -- test/library-admin-layout.test.ts`
- `npm --prefix frontend run test`
- `npm run build:frontend`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/views/admin/AdminLibraryView.vue frontend/test/library-admin-layout.test.ts frontend/test/admin-style-semantics.test.ts
git commit -m "feat(admin-library): improve UX clarity for critical actions"
```

---

### Task 5: Add Operations Runbook (Deploy / Rollback / Incident)

**Files:**
- Create: `docs/guides/ops-release-runbook.md`
- Create: `docs/guides/ops-library-incident-runbook.md`
- Modify: `README.md`

**Step 1: Write the failing test**

```js
// tests/ops-docs.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('ops docs include rollback and recovery sections', () => {
  const release = fs.readFileSync('docs/guides/ops-release-runbook.md', 'utf8');
  const incident = fs.readFileSync('docs/guides/ops-library-incident-runbook.md', 'utf8');
  assert.match(release, /Rollback/);
  assert.match(release, /Verification/);
  assert.match(incident, /Permanent Delete/);
  assert.match(incident, /Embed/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/ops-docs.test.js`
Expected: FAIL (docs missing)

**Step 3: Write minimal implementation**

Runbook 必须覆盖：
- 发布前检查（`npm run qa:release`）
- 容器发布步骤（拉镜像、启动、健康检查）
- 回滚步骤（镜像回退 + 数据目录保留）
- 事故处理：误删恢复、永久删除不可逆说明、Embed 平台故障降级
- 值班排查命令清单（`docker logs`, `curl /api/health`, `lsof -i`）

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/ops-docs.test.js`
- `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add docs/guides/ops-release-runbook.md docs/guides/ops-library-incident-runbook.md README.md tests/ops-docs.test.js
git commit -m "docs(ops): add release and incident runbooks"
```

---

### Task 6: Final Acceptance and Score Re-evaluation

**Files:**
- Modify: `docs/plans/2026-02-27-quality-9plus-phase1-implementation-plan.md` (append execution evidence)
- Create: `docs/guides/quality-scorecard-2026-02-27.md`

**Step 1: Write the failing test**

- 无代码测试；改为“验收清单必须全部打勾”作为失败前提。

**Step 2: Run verification to prove gaps (initially fail)**

Run:
- `npm run qa:release`
- 手动核对：Runbook 是否可按步骤执行到健康检查
Expected: 若任一步骤缺失则视为 FAIL

**Step 3: Minimal completion work**

- 补齐缺失脚本/文档/说明。
- 在 `quality-scorecard` 中记录评分前后变化、证据链接（测试输出、smoke 截图路径）。

**Step 4: Final verify**

Run:
- `npm run qa:release`
- `npm test`
- `npm --prefix frontend run test`
- `npm run build:frontend`
Expected: PASS

**Step 5: Commit**

```bash
git add docs/guides/quality-scorecard-2026-02-27.md docs/plans/2026-02-27-quality-9plus-phase1-implementation-plan.md
git commit -m "chore(quality): finalize phase1 acceptance and scorecard"
```

---

## Execution Notes

- 执行中必须遵循：`@superpowers:test-driven-development`、`@superpowers:verification-before-completion`。
- 若 UI 改动引入新交互，必须补 smoke 或 Vitest 断言，不接受“只人工测”。
- 每个 Task 独立提交，确保可以按任务粒度回滚。

## Risk Register

- 风险：smoke 脚本不稳定导致误报。  
  缓解：统一等待条件（health、networkidle、关键响应），保留 server 日志与截图。
- 风险：UX 改动影响已有流程。  
  缓解：只做增量，不改 API 契约；每次改动后跑全量测试 + smoke。
- 风险：运维文档与实际部署漂移。  
  缓解：每次发布按 Runbook 演练并更新版本日期。

## Execution Evidence (2026-02-27)

### Acceptance Checklist

- [x] Task 1: 发布质量闸门脚本与 `qa:release` 命令已落地
- [x] Task 2: 资源库管理生命周期 smoke（上传/软删/恢复/永久删除）已落地
- [x] Task 3: 文件夹快速切换竞态防护与回归断言已落地
- [x] Task 4: 管理端关键 UX 增强（批量反馈、危险操作确认、日志筛选）已落地
- [x] Task 5: 运维发布与事故处理 Runbook 已落地
- [x] Task 6: 质量评分卡与验收证据已落地

### Verification Log

- `npm run qa:release` -> PASS（含 backend tests、frontend tests、frontend build、`smoke:spa-public`、`smoke:spa-admin`、`smoke:spa-admin-write`、`smoke:spa-library-admin`）
- `npm test` -> PASS（145/145）
- `npm --prefix frontend run test` -> PASS（35 files, 107 tests）
- `npm run build:frontend` -> PASS

### Artifact Paths

- `output/playwright/spa-public-smoke-catalog.png`
- `output/playwright/spa-public-smoke-viewer.png`
- `output/playwright/spa-admin-smoke-home-after-logout.png`
- `output/playwright/spa-admin-smoke-writepath-content.png`
- `output/playwright/spa-library-admin-smoke.png`
