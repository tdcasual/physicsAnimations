# Ops Release Runbook

适用范围：`physicsAnimations` 容器化发布、升级与快速回滚。

## 1. Pre-Release Checklist

在发布前必须执行：

```bash
npm run qa:release
```

`qa:release` 会串行执行：
- 后端测试
- 前端测试
- 前端构建
- 公共站点 smoke
- 管理端 smoke
- 管理写路径 smoke
- 资源库管理 smoke

若任一步失败，禁止发布。

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

## 4. Rollback

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

## 5. Troubleshooting Quick Commands

```bash
docker ps
docker logs --tail 300 physics-animations
curl -i http://127.0.0.1:4173/api/health
lsof -iTCP:4173 -sTCP:LISTEN -n -P
```

## 6. Notes

- `content` 卷必须持久化挂载，否则上传资源与运行态配置会丢失。
- GeoGebra 自托管更新与应用发布解耦，不应阻塞业务服务启动。
