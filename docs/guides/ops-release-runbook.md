# Ops Release Runbook

适用范围：`physicsAnimations` 容器化发布、升级与快速回滚。

## 1. Pre-Release Checklist

在发布前必须执行：

```bash
npm run qa:release
```

对于 `Dependabot` / 其他依赖升级 PR，也必须走同一套 `qa:release`，不要以“只改依赖”为理由跳过 smoke 和前后端测试。

`qa:release` 会串行执行：
- 文件体积门禁（`guard:file-size`）
- 安全模式门禁（`guard:security`）
- 依赖风险门禁（`guard:audit`，阻断 `high/critical` 漏洞）
- 后端测试
- 前端测试
- 前端类型检查
- 前端构建
- 公共站点 smoke
- 管理端 smoke
- 管理写路径 smoke
- 资源库管理 smoke

若任一步失败，禁止发布。

读路径策略发布前确认：

- 当前版本为单轨 SQL 读路径，固定内建 `sql_only`（非配置项）。
- 回滚路径为镜像/提交回滚，不再支持 dual 环境变量回切。

## 2. Release Steps

1. 拉取镜像并更新容器

```bash
docker compose pull
docker compose up -d
```

2. 健康检查

```bash
curl -sf http://127.0.0.1:4173/api/health
```

3. 查看启动日志（确认端口、管理员配置、无致命错误）

```bash
docker logs --tail 200 physics-animations
```

## 3. Verification

发布后最少做以下 Verification：

1. 首页可访问：`/`
2. 管理页可访问：`/admin/dashboard`
3. 资源库页可访问：`/admin/library`
4. 关键 API 正常：`/api/health`、`/api/catalog`

## 4. Metrics 阈值检查（p95 / 5xx）

发布后还需执行可观测性阈值检查，重点关注 `/api/metrics`：

- `http.latencyMs.p95`（整体 p95 延迟）
- `http.statusCounts.5xx`（5xx 错误计数）

详细阈值与触发动作见：

- `docs/guides/ops-observability-thresholds.md`

最小检查命令：

```bash
curl -sf http://127.0.0.1:4173/api/metrics | jq '.http'
```

若超过阈值，先按阈值文档执行缓解动作，再决定是否回滚。

## 5. State DB 故障判定（SQL 异常即不可用）

当前读接口为单轨 SQL 路径。出现 SQL 故障时，以下接口会返回 `503`：

- `/api/items`
- `/api/items/:id`
- `/api/catalog`
- `/api/categories`

若出现以下信号，按“SQL 读路径故障”处理：

- 日志出现 `items_sql_merged_query_failed`
- 日志出现 `categories_sql_dynamic_counts_failed`
- 日志出现 state-db circuit/open 相关告警

最小排查步骤：

1. 先确认用户侧读接口是否已返回 `503 state_db_unavailable`。
2. 检查 `content/state.sqlite`、`state.sqlite-wal`、`state.sqlite-shm` 是否异常增长或损坏。
3. 检查宿主机磁盘空间、文件权限、IO 错误。
4. 观察 `/api/metrics` 中 `http.latencyMs.p95` 与 `http.statusCounts.5xx` 是否持续恶化。
5. 若故障持续，按回滚流程切回上一个稳定版本。
6. 若服务启动阶段直接失败，优先检查 `STATE_DB_MODE` 是否为 `off` / `sqlite`，非法值会触发 `invalid_state_db_mode`。

## 6. Rollback

触发条件：发布后健康检查失败、核心页面不可用、关键写路径异常。

Rollback 操作：

1. 切回上一个可用镜像 tag（不要清空 `content` 卷）

```bash
docker compose pull <previous-tag>
docker compose up -d
```

2. 再次执行健康检查与基础验证

```bash
curl -sf http://127.0.0.1:4173/api/health
```

3. 记录回滚时间、原因、影响范围。

## 7. Troubleshooting Quick Commands

```bash
docker ps
docker logs --tail 300 physics-animations
curl -i http://127.0.0.1:4173/api/health
lsof -iTCP:4173 -sTCP:LISTEN -n -P
```

## 8. Notes

- `content` 卷必须持久化挂载，否则上传资源与运行态配置会丢失。
- GeoGebra 自托管更新与应用发布解耦，不应阻塞业务服务启动。
