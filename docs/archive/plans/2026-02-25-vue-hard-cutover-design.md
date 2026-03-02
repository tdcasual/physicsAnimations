# Vue 全量硬切换与 Legacy 彻底清理设计

日期：2026-02-25  
状态：已确认（Brainstorming 结果落盘）  
项目：`physicsAnimations`

## 1. 背景

当前仓库已具备 Vue SPA（`frontend/`）与旧版静态前端（根目录 `index.html` / `viewer.html` + `assets/*.js`）并存能力。并存模式在迁移期可降低风险，但会持续引入双入口歧义、测试与文档重复维护成本，以及运行行为不一致风险。

本设计目标是结束迁移期，执行一次性硬切换：系统对外只保留 Vue SPA 前端形态，删除全部 legacy 前端代码与回退逻辑。

## 2. 已确认决策（本次锁定）

- 切换策略：硬切换（不再保留过渡版本）。
- 旧 URL 策略：legacy URL 直接失效（返回 404），不重定向。
- 新入口策略：`/` 作为 SPA 根入口，`/viewer/:id` 作为预览路由，`/admin/*` 作为管理路由。
- 回滚策略：不保留运行时开关；仅通过版本回滚（`git revert` / 发布回退）处理故障。
- 清理策略：彻底清理 legacy 代码、测试、脚本、文档描述。

## 3. 方案对比与选择

### 方案 A（采纳）：测试先行的一次性切换

先建立新旧路由契约测试，再修改服务端路由与入口逻辑，最后删除 legacy 文件、脚本和文档描述，收尾执行全量验证。

优点：
- 风险可控：每一步有回归网。
- 变更可审计：提交粒度清晰，便于排障。
- 行为可验证：能明确证明“新入口可用 + 旧入口失效”。

缺点：
- 前置测试改造成本较高。

### 方案 B：先大改后补测

优点是快；缺点是失败时难定位，不满足本次“彻底清理且稳定上线”的目标。

### 方案 C：先删文件再修逻辑

优点是表面清理快；缺点是容易进入不可运行中间态，不采纳。

## 4. 目标架构与路由契约

### 4.1 目标形态

- 前端唯一实现：Vue SPA（`frontend/src/**`）。
- 服务端职责：API + 内容分发 + SPA 构建产物托管。
- 不再存在 legacy 前端运行路径。

### 4.2 路由契约（切换后）

- `GET /`：返回 `frontend/dist/index.html`（SPA 入口）。
- `GET /assets/*`：返回 `frontend/dist/assets/*`。
- `GET /viewer/:id`、`GET /admin/*` 与其他前端路由：history fallback 到 SPA 入口（排除 `/api/*` 与受控静态资源路径）。
- `GET /index.html`、`GET /viewer.html`、`GET /app`、`GET /app/*`、legacy 约定前端路径：统一返回 `404 {"error":"not_found"}`。

### 4.3 SPA 产物缺失行为

若 `frontend/dist/index.html` 缺失，根入口返回可观测错误（建议 `503 {"error":"service_unavailable"}`），用于部署告警和排查，不再回退到 legacy。

## 5. 前端边界与清理清单

### 5.1 保留范围

- `frontend/src/**`（Vue 页面、路由、状态、服务层）
- `frontend/index.html`（Vite 模板）
- `frontend/dist/**`（构建产物）
- `server/routes/**`、`server/lib/**` 中与 API/存储相关的非 legacy 逻辑

### 5.2 删除范围（必须执行）

- 根目录 legacy 前端文件：`index.html`、`viewer.html`
- legacy 脚本与样式入口：`assets/app.js`、`assets/viewer.js`（以及仅供旧入口使用的样式/逻辑）
- legacy 回退/兼容脚本与测试：如 `scripts/smoke_spa_legacy_fallback.js` 及 CI 中对应 job
- 文档中关于 `/app` 迁移入口、`SPA_DEFAULT_ENTRY` 回退语义、legacy fallback 的描述

### 5.3 清理执行顺序

1. 先断引用（服务端路由与脚本入口）；  
2. 再删文件实体；  
3. 最后删文档与 CI 兼容说明。  

该顺序避免“代码已删但运行时仍引用”的半坏状态。

## 6. 数据流与不变式

本次为“入口与实现切换”，不是“数据层改造”。以下不变：

- `content/` 数据结构与读写路径保持不变。
- 现有 API 契约尽量保持兼容，避免与切换同时引入业务行为变更。
- Vue 前端继续通过统一服务层调用 API，UI 不直接承担底层请求细节。

约束：

- 不引入新的权威数据源。
- 不做双写或迁移脚本。
- 出现故障时优先版本回退，不对生产数据做临时性结构改造。

## 7. 错误处理策略

- 业务 API 失败：沿用现有统一错误模型。
- 入口错误：
  - SPA 构建产物缺失 -> `503 service_unavailable`
  - legacy URL 访问 -> `404 not_found`
- 管理端鉴权失败（401）：清理会话并跳转登录（Vue 路由守卫处理）。

目标是错误可观测、可诊断，且无静默回退路径。

## 8. 测试与验收门禁

### 8.1 必须通过的测试层级

- `node:test`：服务端路由契约测试
  - `/` 返回 SPA
  - `/index.html`、`/viewer.html`、`/app/*` 返回 404
  - `/api/*` 正常
- `vitest`：前端关键路径
  - 公开目录加载
  - viewer 路由参数解析
  - admin 鉴权守卫
- smoke：端到端主链路
  - 浏览、预览、登录、管理写路径可用
  - legacy fallback smoke 被移除或替换为“legacy 必须 404”检查

### 8.2 完成定义（DoD）

- 仓库不存在可运行 legacy 前端代码与入口路由。
- 所有 legacy URL 行为符合 404 契约。
- Vue SPA 在根路径完整承载公开与管理场景。
- 文档、脚本、CI 与实际行为一致，不含回退描述残留。
- 全量测试绿灯后方可发布。

## 9. 实施分解（高层）

### 阶段 1：契约测试先行

- 新增/调整路由测试，先表达目标行为。

### 阶段 2：服务端切换

- 移除 legacy 回退分支与 `/app` 迁移入口语义。
- 落实根路径 SPA 与 legacy 404 策略。

### 阶段 3：代码清理

- 删除 legacy 前端文件与兼容脚本。
- 删除相关测试与 CI 兼容任务。

### 阶段 4：文档与发布收尾

- 更新 README 与 guides，删除迁移期表述。
- 输出发布变更说明（明确旧 URL 失效）。

## 10. 风险与缓解

- 风险：外部历史链接（`/viewer.html?id=...`）失效。  
  缓解：发布说明明确破坏性变更；如需业务层应对，交由上层链接提供方更新。

- 风险：遗漏 legacy 引用导致运行时报错。  
  缓解：执行全仓 `rg` 引用扫描（关键词：`viewer.html`、`/app`、`SPA_DEFAULT_ENTRY`、`assets/app.js`），并在 PR 中附扫描结果。

- 风险：部署缺少 `frontend/dist`。  
  缓解：构建链路与镜像流程强制执行 `npm run build:frontend`，并以 503 作为可观测故障信号。
