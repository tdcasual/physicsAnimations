# Quality Scorecard 2026-02-27

## Target

将项目综合质量从 `8.2` 提升到 `9+` 的第一阶段。

## Evidence

### Verification Commands

- `npm test`
- `npm --prefix frontend run test`
- `npm run build:frontend`
- `node --test tests/qa-release-gate.test.js tests/library-smoke-script.test.js tests/ops-docs.test.js`

### Smoke Coverage

- `npm run smoke:spa-public`
- `npm run smoke:spa-admin`
- `npm run smoke:spa-admin-write`
- `npm run smoke:spa-library-admin`

### Deliverables

- 发布质量闸门：`qa:release`
- 资源库生命周期 smoke：覆盖上传、软删、恢复、永久删除
- 管理端并发切换竞态防护（请求序号 + 过期响应丢弃）
- 运维 Runbook（发布/回滚/事故处理）

## Re-score (Phase 1)

- 功能完整度：`8.8 -> 9.0`
- 稳定性：`8.6 -> 9.0`
- 可维护性：`8.1 -> 8.6`
- 测试质量：`8.9 -> 9.2`
- 运维交接：`7.9 -> 9.0`

综合：`8.2 -> 8.96`（接近 9，下一阶段重点做 UX 深化与 E2E 扩展可突破 9+）

## Next Focus

1. 管理端高频流程做真实 UI 驱动 E2E（减少 API 旁路）
2. 课堂模式与管理页视觉统一性优化
3. 事故审计日志结构化（操作人、对象、结果、trace id）
