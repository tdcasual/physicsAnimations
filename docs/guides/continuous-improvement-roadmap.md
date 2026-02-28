# 持续改进路线图（2026-02-28 Baseline）

这份文档用于后续迭代时快速接手：先看基线，再按优先级推进，不重复造轮子。

## 1. 当前基线（可量化）

### 1.1 质量门禁（发布前）

`npm run qa:release` 串行执行：

1. `npm run guard:file-size`
2. `npm run guard:security`
3. `npm test`
4. `npm --prefix frontend run test`
5. `npm run typecheck:frontend`
6. `npm run build:frontend`
7. `npm run smoke:spa-public`
8. `npm run smoke:spa-admin`
9. `npm run smoke:spa-admin-write`
10. `npm run smoke:spa-library-admin`

### 1.2 测试覆盖规模

- 后端测试文件：`71`
- 前端测试文件：`46`

### 1.3 文件体积预算热点（guard:file-size）

当前最接近上限的文件：

- `tests/library-route-api.test.js`: `853/880`
- `tests/library-service.test.js`: `771/880`
- `frontend/src/features/library/useLibraryAdminState.ts`: `449/455`
- `frontend/src/views/CatalogView.vue`: `373/380`
- `frontend/src/features/admin/taxonomy/useTaxonomyAdmin.ts`: `358/360`

### 1.4 性能预算（perf gate）

预算配置见：`config/performance-budgets.json`

- `/api/catalog`: avg `<=80ms`, p95 `<=180ms`
- `/api/categories`: avg `<=50ms`, p95 `<=120ms`
- `/api/items?page=1&pageSize=24`: avg `<=40ms`, p95 `<=90ms`
- `/api/items?type=link`: avg `<=40ms`, p95 `<=90ms`
- `/api/items?q=term`: avg `<=40ms`, p95 `<=90ms`

### 1.5 可观测性输出（/api/metrics）

新增并可稳定消费的字段：

- `app`: name/version
- `process`: pid/node/platform/arch
- `http`: `requestsTotal`、`activeRequests`、`statusCounts`、`latencyMs(avg/p50/p95/max/samples)`
- 兼容保留：`uptimeSec`、`memory`、`taskQueue`、`stateDb`、`screenshotQueue`

## 2. 当前改进重点（按优先级）

### P0（下一轮优先，1-2 周）

1. **消除体积红线风险（先拆临界文件）**
   - `useLibraryAdminState.ts` 目标：`<=420`
   - `CatalogView.vue` 目标：`<=340`
   - `useTaxonomyAdmin.ts` 目标：`<=330`

2. **安全门禁从“模式阻断”升级到“依赖风险阻断”**
   - 新增 `npm audit --omit=dev`（或可控白名单策略）进入 `qa:release`
   - 先以 `high/critical` 为失败阈值

3. **可观测性闭环**
   - 基于 `/api/metrics` 的 `http.latencyMs.p95`、`statusCounts.5xx` 建立告警阈值
   - 明确告警触发后的标准处理动作（runbook 补全）

### P1（稳定增强，2-4 周）

1. 引入 Prometheus 兼容指标端点（文本格式）  
2. 增加真实 UI 驱动 E2E（Playwright）覆盖后台关键写路径  
3. 将性能预算按场景分级（本地开发 / CI / 生产回归）  

### P2（中长期）

1. 审计日志结构化（操作者、对象、动作、结果、requestId）  
2. 高风险上传内容策略增强（策略分级、策略解释）  
3. `qa:release` 结果归档（JSON 报告 + 历史趋势）  

## 3. 下次接手的固定流程

每次启动新一轮改进，按以下顺序执行：

1. 拉最新代码后执行 `npm run qa:release`
2. 执行 `npm run guard:file-size`，优先处理 top 文件
3. 执行 `npm run guard:security`，处理新增风险模式
4. 若改动涉及 API 热路径，执行 `node --test tests/perf-api.test.js`
5. 更新对应文档（本文件 + runbook/security 相关章节）

## 4. 变更完成定义（针对“改进类任务”）

一次改进任务完成，至少满足：

1. 有**可验证证据**（测试/门禁输出）
2. 有**文档更新**（至少更新一个 guide）
3. 有**回滚思路**（影响范围和撤销路径）
4. 不引入新的体积超预算文件

可复用总规范：`docs/guides/maintainability-extensibility-dod.md`
