# physicsAnimations

把分散的物理动画整理成一个可浏览、可管理、可部署的小站。

你可以把本地 HTML、ZIP 资源包和外链网页统一收进来，系统会自动生成缩略图，并提供分类浏览和预览体验。

## 这项目适合谁

- 想把教学/实验网页做成“一个站”来展示的人
- 手上有很多本地动画 HTML，想统一管理的人
- 希望部署后可持续维护内容，而不是一次性静态页面的人

## 30 秒跑起来

```bash
npm install
npm start
```

打开 `http://localhost:4173`。

未设置管理员环境变量时，系统会在首次启动时随机生成管理员账号密码，并打印到服务日志（Docker 可用 `docker logs <container>` 查看）。

如果你在本机遇到截图依赖缺失，再执行一次：

```bash
npm run install-playwright-deps
```

## 你可以直接用的能力

- 分类浏览 + 搜索
- 动画卡片自动缩略图
- 预览页支持内置资源和外链资源
- 后台可上传 HTML / ZIP / 外链，支持编辑与删除
- 资源库支持文件夹卡片（封面可空白或图片）
- 文件夹内可上传 `.ggb` / PhET HTML，支持容器页自动接入或仅下载
- 上传 HTML 命中风险特征时会先提示确认，再决定是否继续上传
- 内容目录可持续维护（而不是每次手改静态文件）

## 常用命令

```bash
# 启动服务
npm start

# 重新生成 animations.json + 缩略图
npm run build-catalog

# 前端开发 / 构建 / 测试
npm run dev:frontend
npm run build:frontend
npm run test:frontend

# 发布前质量闸门（测试 + 构建 + smoke）
npm run qa:release

# 更新 GeoGebra 自托管包（资源库 embed）
npm run update:geogebra-bundle
```

## GeoGebra 内网自托管（带在线兜底）

资源库 `.ggb` 的容器页默认采用“自托管优先、在线兜底”：

1. 优先加载 `/content/library/vendor/geogebra/current/deployggb.js`
2. 自托管不可用时，回退到 `https://www.geogebra.org/apps/deployggb.js`

首次部署或定期更新时执行：

```bash
npm run update:geogebra-bundle
```

容器部署建议使用更新任务容器（不依赖本机手工）：

```bash
docker compose --profile maintenance run --rm ggb-updater
```

该命令会下载官方 Math Apps Bundle，生成稳定路径：

- `/content/library/vendor/geogebra/current/deployggb.js`
- `/content/library/vendor/geogebra/current/web3d/`

详细可配置项见 [配置项参考（环境变量）](docs/guides/configuration.md) 中 “GeoGebra 自托管（资源库）” 一节。

## Docker Compose 快速部署

仓库提供了容器模板文件：`docker-compose.example.yml`。

你现有的最小 compose（含 `ADMIN_USERNAME` / `ADMIN_PASSWORD`）仍然兼容，可以继续使用：

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

如果要启用 GeoGebra 自动更新，只需要在现有文件上增加 `ggb-updater` 服务（见 `docker-compose.example.yml`）。

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
```

```bash
docker compose pull
docker compose up -d
docker logs -f physics-animations

# 手动触发一次 GeoGebra 自托管包更新（可配置成定时任务）
docker compose --profile maintenance run --rm ggb-updater
```

说明：`content` 卷建议始终挂载，这样重建容器后内容不会丢。

## 使用策略（默认行为）

- 公共浏览：默认可匿名访问
- 资源管理：需要管理员登录
- `/api/metrics`：默认仅登录可见；若你想匿名访问，设置 `METRICS_PUBLIC=true`

## 文档导航

文档总览入口：
- [docs/README.md](docs/README.md)

技术细节都拆到了文档里，README 只保留上手信息：

- [部署与升级说明](docs/guides/deployment.md)
- [配置项参考（环境变量）](docs/guides/configuration.md)
- [API 说明（公开接口 / 管理接口）](docs/guides/api.md)
- [前端 SPA 与路由行为](docs/guides/spa-and-frontend.md)
- [安全说明与上线建议](docs/guides/security.md)
- [发布运维 Runbook](docs/guides/ops-release-runbook.md)
- [资源库事故处置 Runbook](docs/guides/ops-library-incident-runbook.md)

## 目录结构（简版）

- `animations/`：内置动画资源
- `animations/thumbnails/`：内置缩略图
- `content/`：运行时数据（上传内容、配置、任务状态）
- `frontend/`：Vue SPA 前端
- `server/`：后端 API 与存储逻辑
- `scripts/`：构建目录、截图与工具脚本

## 维护边界（代码拆分后）

- 前端 admin 页面采用“壳层 + composable + panel”分层：
  - 壳层：`frontend/src/views/admin/*.vue`
  - 状态/动作：`frontend/src/features/admin/**` 或 `frontend/src/features/library/**`
  - 子面板：`frontend/src/views/admin/{content,uploads,library,taxonomy,system}/`
- 后端 library 服务采用“facade + domain service”：
  - facade：`server/services/library/libraryService.js`
  - domain：`assetsService` / `foldersService` / `embedProfilesService` / `viewerRenderService`
- state-db 采用“入口 facade + storeFactory + sqliteMirror + mirrorHelpers”分层：
  - 入口：`server/lib/stateDb.js`
  - 组装：`server/lib/stateDb/storeFactory.js`
  - 引擎：`server/lib/stateDb/sqliteMirror.js`
  - 共享 helper：`server/lib/stateDb/mirrorHelpers.js`
- 文件体积守则（建议）：
  - `frontend/src/views/admin/*.vue` 不超过约 700 LOC
  - `server/services/library/*.js` 不超过约 500 LOC

## 许可

[AGPL-3.0](LICENSE)
