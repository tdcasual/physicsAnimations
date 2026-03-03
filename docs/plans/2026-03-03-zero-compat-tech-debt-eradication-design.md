# 2026-03-03 零兼容技术债清除设计（硬切版）

## 1. 目标与边界

本方案以“代码库干净、健壮、解耦、可扩展”为唯一目标，明确采用**零兼容**策略：

1. 不保留向后兼容分支。
2. 不提供迁移期双轨运行（no dual mode）。
3. 不提供 silent fallback（失败即显式失败）。
4. 不为旧语义补垫片（shim/adaptor）。

适用范围：

- 后端运行时主链路（配置、存储、读写、查询、路由装配）
- 前端 Admin 状态编排与 API 客户端
- 关键运维脚本与计划文档治理

非目标：

- 保留历史环境变量语义
- 保留历史 plans 的“并存真相”
- 保留“可运行但不可解释”的容错分支

---

## 2. 当前债务基线（2026-03-03）

### 2.1 质量健康证据（现状）

- 后端测试：`336/336` 通过
- 前端测试：`195/195` 通过
- `guard:file-size` 通过，热点文件接近阈值
- `guard:security`、`guard:audit` 通过

### 2.2 结构负担画像

1. 文档真相分裂：`docs/plans` 同时存在“读路径 fallback”与“sql-only 硬切”两套相反方案。
2. 后端状态层复杂：`stateDb/storeFactory/wrappedStore/queryFacade` 组合可用但认知成本高。
3. 前端编排层重：`useLibraryAdminState.ts` + `AdminLibraryView.template.html` 维持在预算边缘。
4. API 客户端重复：`auth/admin/library` 三套 fetch+auth+error 逻辑。
5. 脚本单体过重：`scripts/update_geogebra_bundle.js` 接近预算上限。

### 2.3 评分（当前）

- 健壮性：`9.2/10`
- 可维护性：`7.4/10`
- 解耦性：`7.8/10`
- 可扩展性：`8.0/10`
- 兼容性代价（越高越差）：`6.8/10`
- 综合：`8.1/10`

---

## 3. 方案对比与推荐

### 方案 A：一次性大爆破（Big Bang）

- 2-4 周冻结功能，直接重写主链路。
- 优点：清理最彻底，历史包袱最少。
- 缺点：回归面过大，停机/回退成本最高。

### 方案 B：分层硬切（推荐）

- 按“文档真相 -> 后端单轨 -> 前端单轨 -> 脚本拆分”顺序做多次不可兼容提交。
- 每个切片都只有一个新语义，不保留旧路径。
- 优点：风险可控、审计清晰、交付连续。
- 缺点：需要严格执行阶段门禁。

### 方案 C：新核心并行（Greenfield Core）

- 新建 `vNext` 目录并行开发，最后替换旧实现。
- 优点：旧代码不受污染。
- 缺点：短期重复开发成本极高。

推荐采用 **方案 B（分层硬切）**：在不保留兼容分支的前提下，保持可验证、可审计、可推进。

---

## 4. 目标架构（To-Be）

### 4.1 后端

1. 读路径单轨：固定 SQL 查询路径，失败统一 `state_db_unavailable`。
2. 配置单轨：去掉策略开关语义漂移（避免一个行为由多个 env 组合决定）。
3. 状态链路单轨：删除“读主存 + 写镜像 + 再读回写”的隐式回补路径，明确单一事实源。
4. 路由装配减重：`app.js` 仅做装配，领域行为下沉服务层。

### 4.2 前端

1. 单一 HTTP 客户端：鉴权、401 处理、错误模型统一。
2. Admin Library 状态域拆分：folder/asset/embed/selection 独立域，壳层只编排。
3. 模板职责收敛：模板只做渲染，不承载流程逻辑。

### 4.3 文档与治理

1. `docs/plans` 只允许唯一“当前计划”。
2. 历史方案一律归档到 `docs/archive/plans`。
3. 新增 guard：阻断互相冲突的 active plan 并存。

---

## 5. 可执行清债清单（零兼容）

## Phase 0：真相收口（1 天）

1. 将相互冲突的 active plan 归档，仅保留当前执行计划。
2. 在 `docs/plans/README.md` 增加“单一真相”规则与 CI 守卫说明。
3. 增加测试：检测 active plans 中是否出现同主题冲突策略（fallback vs sql-only）。

验收：

- `node --test tests/ops-docs.test.js`
- `node --test tests/docs-guides-contract-guard.test.js`

## Phase 1：后端配置与读路径硬切（2-3 天）

1. 移除 `READ_PATH_MODE` 外部可配置性（固定 `sql_only` 语义）。
2. 简化 `readService` 错误分支，统一失败协议。
3. 删掉相关历史说明和测试冗余用例（只保留单轨语义）。

验收：

- `node --test tests/read-path-mode-config.test.js tests/items-read-service.test.js tests/items-sql-unavailable-contract.test.js tests/catalog-sql-query.test.js tests/categories-sql-query.test.js`

## Phase 2：状态层降复杂（3-4 天）

1. 重构 `stateDb` 装配，消除 wrappedStore 的双向回补语义。
2. 将“镜像失败可继续”策略收敛为显式状态，不再存在隐式修补路径。
3. 删除不再需要的过渡测试与分支注释。

验收：

- `node --test tests/state-db-*.test.js tests/app-query-repo-wiring.test.js tests/query-repos-contract.test.js`

## Phase 3：前端 API 客户端单轨化（1-2 天）

1. 新建统一 `httpClient`（auth header、401、错误对象）。
2. `adminApi/libraryApi/authApi` 迁移到单客户端。
3. 删除重复函数与重复错误模型。

验收：

- `npm --prefix frontend run test -- admin-api-contract library-api auth-store --run`
- `npm run typecheck:frontend`

## Phase 4：Admin Library 状态域硬拆（3-4 天）

1. `useLibraryAdminState` 拆为 domain store + orchestrator。
2. 将超长 facade 按域导出，减少大对象透传。
3. 模板与状态依赖按 panel 就近化。

验收：

- `npm --prefix frontend run test -- library-admin-state-size library-admin-layout library-admin-asset-crud library-admin-asset-editor library-admin-upload --run`
- `npm run guard:file-size`

## Phase 5：脚本与工具清债（1-2 天）

1. 拆分 `update_geogebra_bundle.js`（cli/lock/download/extract/switch/prune）。
2. 保持 CLI 参数契约，但内部结构模块化。
3. 追加脚本体积 guard 与定向单测。

验收：

- `node --test tests/update-geogebra-bundle.test.js`
- `npm run guard:file-size`

## Phase 6：总验收与收口（1 天）

1. 全量门禁跑通。
2. 更新路线图与 runbook，删除所有“过渡性说明”。
3. 生成最终评分与遗留清单（若有）。

验收：

- `npm run qa:release`
- `npm test`
- `npm --prefix frontend run test -- --run`

---

## 6. 建议提交切片（便于回滚）

1. `docs(plan): enforce single active truth and archive conflicting plans`
2. `refactor(read-path): hard-fix sql-only semantics and remove mode toggle`
3. `refactor(state-db): remove wrapped mirror recovery complexity`
4. `refactor(frontend): unify admin/library/auth http client`
5. `refactor(frontend): split library admin state into domain stores`
6. `refactor(scripts): modularize geogebra updater pipeline`
7. `chore: finalize zero-compat debt eradication phase`

---

## 7. 目标评分（完成后）

- 健壮性：`9.3+`
- 可维护性：`9.1+`
- 解耦性：`9.0+`
- 可扩展性：`9.1+`
- 兼容性代价：`<=2.0`
- 综合：`9.2+`

---

## 8. 执行纪律（强约束）

1. 任何新改动不得引入 fallback 分支。
2. 任何新改动不得新增策略开关替代架构决策。
3. 任何历史语义如果与当前冲突，直接删除，不做兼容层。
4. 每阶段必须先有 RED 用例，再实现 GREEN。

