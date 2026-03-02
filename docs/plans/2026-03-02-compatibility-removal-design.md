# 2026-03-02 去兼容化重构设计（零兼容双模式）

## 1. 背景与目标

当前项目存在明显的历史兼容分支：存储模式别名归一（`mirror` / `local+webdav` -> `hybrid`）、运行时自动推断模式、多段读取 fallback（SQL -> 内存/JSON -> builtin 合并）以及文档层对向后兼容的默认承诺。  
这些路径在过去阶段有价值，但现在已经成为复杂度主要来源：分支多、行为隐式、定位困难、测试成本高。

本次重构的目标是：

- 不再保留历史兼容能力；
- 优先架构清晰和代码干净；
- 大幅减少分支与代码量；
- 让错误“早失败、可观测、可定位”。

## 2. 方案选择与原则

本设计采用“**零兼容双模式**”方案：

- 仅保留 `local` 与 `webdav` 两种模式；
- 不再接受旧模式名与别名；
- 不再做自动推断（例如“有 `WEBDAV_URL` 就走 hybrid”）；
- 不再做 silent fallback（例如 local 不可写自动降级、SQL 失败自动回退 JSON）。

核心原则：

1. **显式优先**：所有运行形态通过显式配置决定。
2. **单路径优先**：读写流程每类请求只保留一条业务路径。
3. **失败优先暴露**：失败直接返回错误，不替用户“猜”下一步行为。
4. **契约优先**：接口与配置在当前版本内稳定，不承诺旧版本语义兼容。

## 3. 目标架构（To-Be）

### 3.1 存储层

- `storage.mode` 只允许：`local | webdav`。
- `webdav` 模式必须提供完整配置（`url/basePath/username/password`）。
- `createContentStore` 仅保留两条显式分支：
  - `local` -> local store
  - `webdav` -> webdav store
- 删除 `hybrid` 相关分支与 alias 归一。
- 删除 local 不可写时的自动降级行为（包括 readonly 隐式降级）。

### 3.2 读取层（items）

- `readService` 只走 query-port（`itemsQueryRepo`）主路径；
- 删除 SQL 失败后 fallback 到内存状态、`items.json`、builtin merge 的分支；
- 列表分页、排序、过滤逻辑仅保留一套语义来源；
- query-port 不可用时直接返回 `state_db_unavailable`。

### 3.3 配置与 API 策略

- 明确切换到“当前主版本不提供旧配置语义兼容层”；
- 保留 API 的结构一致性（请求/响应 schema 在本版本内稳定）；
- 对旧字段/旧值直接返回明确错误码，不再自动改写。

## 4. 改造清单（按顺序）

### 阶段 A：先收口契约

1. 后端 `normalizeMode` 收敛为双值枚举；
2. 前端管理页表单与提交 payload 收敛为双值枚举；
3. 增加启动与配置保存预检：非法模式直接拒绝；
4. 文档更新：配置说明、部署说明、升级说明同步更新。

### 阶段 B：删除兼容分支

1. 删除 `contentStore` 中 alias / auto-detect / fallback 分支；
2. 删除 `systemState` 中旧模式归一逻辑；
3. 删除 `items/readService` 中全部读取 fallback 链；
4. 清理失效的日志字段（`fallback:*`）与无效代码/测试桩。

### 阶段 C：发布与验收

1. 使用 `major` 版本发布；
2. 提供一次性升级文档（旧配置 -> 新配置）；
3. 发布后观察错误分布并快速修复真实配置错误（不回滚兼容层）。

## 5. 数据流与错误处理

### 5.1 单路径数据流

- 读取：`route -> auth -> validation -> readService -> queryRepo -> mapper -> response`
- 写入：`route -> validation -> service -> store(mode固定) -> response`
- 配置：`route -> validation(enum/schema) -> persist -> response`

禁止跨层 fallback。每层只处理本层职责。

### 5.2 错误码规范（建议）

- `invalid_storage_mode`（400）
- `invalid_storage_config`（422）
- `state_db_unavailable`（503）
- `storage_not_writable`（500/503，按上下文）

日志规范：

- 去除 `fallback` 标签；
- 统一输出 `failure_stage`、`request_id` 与脱敏配置快照；
- 保证错误可在单次请求链路内追踪。

## 6. 测试与验收标准

### 6.1 单元测试

- 模式枚举仅接受 `local/webdav`；
- 旧别名值全部拒绝；
- `webdav` 配置缺失时报错行为稳定。

### 6.2 服务测试

- `readService` 在 query-port 异常时直接失败；
- 不允许再触发 JSON/内存/builtin 的隐藏路径。

### 6.3 集成测试

- 非法模式启动失败；
- `local` 模式 happy path 可用；
- `webdav` 模式 happy path 可用。

验收门槛：

- fallback 分支代码删除；
- 测试全绿；
- 升级文档可复现；
- 错误码与日志可观测。

## 7. 风险与控制

主要风险：

1. 存量环境仍在使用旧模式值；
2. 线上存在依赖 fallback 的隐式行为；
3. 发布初期配置错误告警可能短期上升。

控制策略：

1. 先执行“契约收口”提交，让风险提前暴露；
2. 再执行“删除分支”提交，避免混合变更难回归；
3. 发布前跑全量测试与关键场景演练；
4. 发布后只修配置，不恢复兼容层。

## 8. 预期收益

- 显著减少条件分支与代码体量；
- 读写行为变得确定、可解释；
- 排错路径缩短；
- 测试矩阵缩小，维护成本下降；
- 架构可持续演进，不再被历史语义持续拖累。
