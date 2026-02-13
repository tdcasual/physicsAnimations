# 部署与升级说明

这份文档面向“把服务稳定跑起来”这件事，包含推荐部署方式、升级步骤和常见注意事项。

## 推荐方式：Docker Compose

```yaml
services:
  physics-animations:
    image: ghcr.io/tdcasual/physicsanimations:latest
    container_name: physics-animations
    ports:
      - "4173:4173"
    environment:
      PORT: 4173
      ADMIN_USERNAME: admin
      ADMIN_PASSWORD: "admin"
    volumes:
      - ./content:/app/content
    restart: unless-stopped
```

启动：

```bash
docker compose up -d
```

## 无痛升级步骤

```bash
docker compose pull
docker compose up -d --remove-orphans
```

如果你希望每次启动都主动拉镜像，也可以用：

```bash
docker compose up -d --pull always
```

无痛升级通常需要满足 3 个条件：

1. 镜像仓库里已经发布了你的目标版本（不是旧 `latest`）。
2. 挂载了 `./content:/app/content`（避免重建后数据丢失）。
3. 环境变量兼容当前版本（尤其是鉴权、存储和 SPA 入口相关配置）。

## 备选方式：直接 `docker run`

```bash
docker run -d --name physics-animations \
  -p 4173:4173 \
  -v "$(pwd)/content:/app/content" \
  -e PORT=4173 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD='admin' \
  ghcr.io/tdcasual/physicsanimations:latest
```

## Serverless / 云函数部署

仓库内提供了：

- `vercel.json`
- `api/index.js`
- `serverless-handler.js`（通用 handler）

在 Serverless 平台上，请优先考虑以下策略：

- 不依赖本地写盘持久化
- 使用 WebDAV 作为运行时存储
- 显式配置 `JWT_SECRET`，避免冷启动后 token 失效

## 部署后检查清单

建议至少检查这几项：

1. `GET /api/health` 返回 `ok: true`
2. 首页可访问，预览页可打开
3. 管理员可登录并新增一条测试内容
4. 重启容器后，测试内容仍存在（验证卷挂载正确）
