# 部署与升级说明

这份文档面向“把服务稳定跑起来”这件事，包含推荐部署方式、升级步骤和常见注意事项。

## 推荐方式：Docker Compose

仓库已提供完整模板：`docker-compose.example.yml`（包含 `physics-animations` 与兼容保留的 `ggb-updater` maintenance 服务）。

## 存储配置变更（破坏性）

当前版本不再保留历史存储兼容层。部署时需要确认：

1. `STORAGE_MODE` 只能是 `local` 或 `webdav`。  
2. 若使用 `webdav`，必须显式设置 `WEBDAV_URL`。  
3. 不再支持 `hybrid` / `mirror` / `local+webdav`。  

兼容边界说明：

- 当前版本仅保留资源库 `embed` 的双源 fallback（自托管 + 在线兜底）。
- 其余历史兼容路径均已硬切，不再提供运行时兼容分支。

## 状态数据库默认行为（部署注意）

- 当前版本默认会启用 `sqlite` 状态数据库（用于查询路径和状态镜像）。
- 如果你的部署希望完全关闭状态数据库，请显式设置 `STATE_DB_MODE=off`。
- 建议同时保留 `STATE_DB_PATH` 的持久化路径，避免容器重启后状态镜像丢失。

最小本地模式配置示例：

```yaml
services:
  physics-animations:
    image: ${PHYSICS_ANIMATIONS_IMAGE:-ghcr.io/tdcasual/physicsanimations:latest}
    build:
      context: .
      target: ${PHYSICS_ANIMATIONS_BUILD_TARGET:-runtime}
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

这份最小配置不会自动更新 GeoGebra 自托管包。
如果你想启用自动更新，保留原服务不变，再追加一个 `ggb-updater` 服务即可。

```yaml
services:
  physics-animations:
    image: ${PHYSICS_ANIMATIONS_IMAGE:-ghcr.io/tdcasual/physicsanimations:latest}
    build:
      context: .
      target: ${PHYSICS_ANIMATIONS_BUILD_TARGET:-runtime}
    container_name: physics-animations
    ports:
      - "4173:4173"
    environment:
      PORT: 4173
    volumes:
      - ./content:/app/content
    restart: unless-stopped

  ggb-updater:
    image: ${PHYSICS_ANIMATIONS_IMAGE:-ghcr.io/tdcasual/physicsanimations:latest}
    profiles: [maintenance]
    working_dir: /app
    entrypoint: ["/bin/sh", "-lc", "./scripts/run_embed_maintenance.sh"]
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

## 可选浏览器运行时

默认发布镜像会构建 `runtime` 目标，不再在主镜像内预装 Chromium。这样可以缩小生产镜像并避免把浏览器运行时带给所有部署。

如果你的部署需要服务端截图能力（例如：
- 新建链接时自动生成缩略图
- 新建 HTML/ZIP 上传时自动生成首图
- 管理端手动触发重截图
），请在仓库目录内切换到 `runtime-browser` 目标本地构建：

```bash
export PHYSICS_ANIMATIONS_IMAGE=physicsanimations:runtime-browser
export PHYSICS_ANIMATIONS_BUILD_TARGET=runtime-browser
docker compose build physics-animations
docker compose up -d
```

如果继续使用默认 `latest` 镜像，这些截图相关路径不会阻塞主服务启动，但日志会出现 `screenshot_dependency_unavailable` 提示。

## Embed 自动更新任务（容器）

`ggb-updater` 是兼容保留的服务名，对应一次性 maintenance 容器；它不会影响主服务可用性，但会统一处理：

1. 更新 `content/library/vendor/geogebra/current`
2. 同步已启用的远程 Embed 平台镜像

手动执行一次：

```bash
docker compose --profile maintenance run --rm ggb-updater
```

建议每天调度一次宿主机 `cron`（示例：每天 03:15）：

```cron
15 3 * * * cd /path/to/physicsAnimations && docker compose --profile maintenance run --rm ggb-updater >> /var/log/physics-animations-ggb-updater.log 2>&1
```

真正是否执行由后台“系统设置 → Embed 自动更新”控制，默认周期为 20 天；即使宿主机每天触发，也只会在到期时真正执行同步。建议配合 `flock` 做互斥，避免并发触发。

## 内网/离线更新策略

如果部署环境无法访问公网，可继续将 `ggb-updater` 中的 GeoGebra 下载地址切到内网制品源：

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

## 部署后检查清单

建议至少检查这几项：

1. `GET /api/health` 返回 `ok: true`
2. 首页可访问，预览页可打开
3. 管理员可登录并新增一条测试内容
4. 重启容器后，测试内容仍存在（验证卷挂载正确）
5. `docker compose --profile maintenance run --rm ggb-updater` 可成功完成
6. 后台“系统设置 → Embed 自动更新”默认显示 20 天周期
7. `.ggb` `embed` 打开时可加载 `/content/library/vendor/geogebra/current/deployggb.js`
