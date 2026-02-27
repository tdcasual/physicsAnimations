# 部署与升级说明

这份文档面向“把服务稳定跑起来”这件事，包含推荐部署方式、升级步骤和常见注意事项。

## 推荐方式：Docker Compose

仓库已提供完整模板：`docker-compose.example.yml`（包含 `physics-animations` 与 `ggb-updater`）。

## 与旧部署文件兼容性

你之前的最小配置与当前版本兼容，仍可直接运行：

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
      ADMIN_PASSWORD: admin
    volumes:
      - ./content:/app/content
    restart: unless-stopped
```

这份最小配置不会失效，但不会自动更新 GeoGebra 自托管包。
如果你想启用自动更新，保留原服务不变，再追加一个 `ggb-updater` 服务即可。

```yaml
services:
  physics-animations:
    image: ghcr.io/tdcasual/physicsanimations:latest
    container_name: physics-animations
    ports:
      - "4173:4173"
    environment:
      PORT: 4173
    volumes:
      - ./content:/app/content
    restart: unless-stopped

  ggb-updater:
    image: ghcr.io/tdcasual/physicsanimations:latest
    profiles: [maintenance]
    working_dir: /app
    entrypoint: ["/bin/sh", "-lc", "./scripts/run_geogebra_updater.sh"]
    environment:
      ROOT_DIR: /app
      GGB_BUNDLE_URL: https://download.geogebra.org/package/geogebra-math-apps-bundle
      GGB_RETAIN_RELEASES: "3"
    volumes:
      - ./content:/app/content
    restart: "no"
```

启动：

```bash
docker compose up -d
docker logs -f physics-animations
```

说明：未显式配置管理员凭据时，会在启动日志打印随机生成的账号密码。

## GeoGebra 更新任务（容器）

`ggb-updater` 是一个一次性任务容器，用于更新 `content/library/vendor/geogebra/current`，不会影响主服务可用性。

手动执行一次：

```bash
docker compose --profile maintenance run --rm ggb-updater
```

推荐用宿主机 `cron` 调度（示例：每周日 03:15）：

```cron
15 3 * * 0 cd /path/to/physicsAnimations && docker compose --profile maintenance run --rm ggb-updater >> /var/log/physics-animations-ggb-updater.log 2>&1
```

建议配合 `flock` 做互斥，避免并发触发。

## 内网/离线更新策略

如果部署环境无法访问公网，请将 `ggb-updater` 的下载地址切到内网制品源：

```yaml
services:
  ggb-updater:
    environment:
      GGB_BUNDLE_URL: https://artifacts.school.local/geogebra/geogebra-math-apps-bundle-latest.zip
      GGB_RETAIN_RELEASES: "3"
```

完全离线时建议：

1. 通过外网同步节点定期下载 bundle 到内网仓库。
2. 生产网仅访问内网仓库，并关闭在线兜底：`LIBRARY_GGB_ENABLE_ONLINE_FALLBACK=false`。

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
5. `docker compose --profile maintenance run --rm ggb-updater` 可成功完成
6. `.ggb` `embed` 打开时可加载 `/content/library/vendor/geogebra/current/deployggb.js`
