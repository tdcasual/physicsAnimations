# 文档总览

这份索引用于快速定位项目文档，适合首次接触、运维发布或准备改代码的同学。

## 快速入口（最常用）

- 配置项参考：`docs/guides/configuration.md`
- 部署与升级：`docs/guides/deployment.md`
- API 说明：`docs/guides/api.md`
- 前端 SPA / 路由行为：`docs/guides/spa-and-frontend.md`
- 发布运维 Runbook：`docs/guides/ops-release-runbook.md`
- 资源库事故处置：`docs/guides/ops-library-incident-runbook.md`
- 维护与扩展 DoD：`docs/guides/maintainability-extensibility-dod.md`
- 持续改进路线图：`docs/guides/continuous-improvement-roadmap.md`

## 我是新手

- 先看 `README.md`
- 然后看 `docs/guides/configuration.md` 和 `docs/guides/deployment.md`

## 我是运维 / 发布

- `docs/guides/ops-release-runbook.md`
- `docs/guides/security.md`
- `docs/guides/ops-library-incident-runbook.md`

## 我是开发 / 改代码

- `docs/architecture/backend-query-ports.md`（后端查询边界）
- `docs/guides/spa-and-frontend.md`（前端路由与模块边界）
- `docs/guides/api.md`（接口约束与稳定性假设）
- `docs/guides/maintainability-extensibility-dod.md`（扩展改动完成定义）
- `docs/guides/continuous-improvement-roadmap.md`（下一轮改进入口）

## 关键边界（TL;DR）

- 后端查询依赖只能通过 Query Ports：`docs/architecture/backend-query-ports.md`
- Admin 页面采用壳层 + composable + panel 分层：`docs/guides/spa-and-frontend.md`

## 文档约定

- `docs/guides/`：可执行的操作指南与运行策略
- `docs/architecture/`：模块边界与约束（长期规则）
- `docs/plans/`：历史方案与实施记录（供参考，不是规范）
