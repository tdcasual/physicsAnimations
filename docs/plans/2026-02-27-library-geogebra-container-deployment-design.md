# Library GeoGebra 容器化部署设计（内网自托管 + 在线兜底）

日期：2026-02-27  
状态：设计中（待按本文实施）

## 1. 背景与问题

当前已经实现两件核心能力：

1. `.ggb` 容器页支持“自托管优先，在线兜底”。
2. `npm run update:geogebra-bundle` 可下载并切换到最新 GeoGebra bundle。

但这套流程目前更偏“本机手动执行”。对于生产容器部署，需要补齐：

1. 更新任务不依赖开发机。
2. 在校园网/离线网中可持续运维。
3. 更新可审计、可回滚、可观察。

## 2. 目标

1. 应用容器重建后，GeoGebra 自托管资源不丢失。
2. 更新任务可在容器体系内定期运行（不依赖本机手工）。
3. 在有外网时可在线兜底；在无外网时可纯内网运行。
4. 更新失败不影响现网访问，且可快速回滚上一个版本。

## 3. 架构选型

### 方案 A：应用容器启动时自动更新

优点：
- 部署简单，单容器即可。

缺点：
- 启动时会引入外部依赖和不确定耗时。
- 更新失败会影响启动链路。
- 多副本启动易并发踩踏。

### 方案 B：应用容器 + 独立更新任务（推荐）

优点：
- 运行流量与更新任务解耦，稳定性最好。
- 更新失败不影响应用可用性。
- 可由 Compose cron / Kubernetes CronJob 统一调度。

缺点：
- 需要额外任务定义和调度配置。

### 方案 C：将 GeoGebra 预烘焙进镜像

优点：
- 完全离线可用，镜像即交付物。

缺点：
- 镜像体积显著增大。
- 每次更新都要重建并重新发布镜像。

## 4. 推荐方案

推荐采用 **B 为主，C 为兜底**：

1. 主路径：`app` 容器 + `ggb-updater` 定时任务共享同一持久卷。
2. 离线兜底：在无法连外网的环境，更新任务改拉取内网制品仓；极端隔离场景用预烘焙镜像。

## 5. 逻辑架构

组件：

1. `app`（Deployment/Service）  
   提供业务 API 与前端，读取 `/app/content/library/vendor/geogebra/current`。
2. `ggb-updater`（CronJob/定时任务容器）  
   定时执行 `node scripts/update_geogebra_bundle.js`，写入新 release 后原子切换 `current`。
3. `bundle-source`（可选）  
   - 联网场景：直接 `download.geogebra.org`  
   - 内网场景：由外网同步器推送到内网对象存储或制品仓
4. `persistent-volume`  
   挂载到 `/app/content`，保证 release、current、用户上传内容持久化。

## 6. 更新流程设计

1. 调度器触发 `ggb-updater` 任务（建议每周一次，周日凌晨）。
2. 任务下载 bundle（官方或内网镜像 URL）。
3. 解压到 `content/library/vendor/geogebra/releases/<version>`。
4. 生成 release 内 `deployggb.js`、`web3d` 稳定链接与 `manifest.json`。
5. 原子替换 `current` 符号链接。
6. 记录日志并上报状态（成功/失败、版本、耗时）。
7. 清理旧版本（建议保留最近 3 个版本；未来可在脚本增加 `--retain`）。

失败策略：

1. 任一步骤失败即退出，`current` 不变。
2. 下次调度自动重试。
3. 人工回滚可直接将 `current` 指向上一个 release。

## 7. 运行配置矩阵

### 7.1 联网环境（默认）

1. `LIBRARY_GGB_ENABLE_ONLINE_FALLBACK=true`
2. 更新源使用官方下载地址
3. 容器页优先本地，异常时自动访问官方脚本兜底

### 7.2 内网可访问内网制品仓（推荐校园部署）

1. `LIBRARY_GGB_ENABLE_ONLINE_FALLBACK=false`（或按策略保留 true）
2. 更新任务 `--url` 指向内网制品源（例如 MinIO/Nexus）
3. 由外网同步任务周期性拉取官方 bundle 到内网制品源

### 7.3 完全离线

1. `LIBRARY_GGB_ENABLE_ONLINE_FALLBACK=false`
2. 不依赖在线更新，使用预烘焙镜像或离线导入 bundle 包
3. 更新通过“离线介质导入 + 执行本地 update 命令”完成

## 8. Docker Compose 落地建议

### 8.1 运行服务

`app` 服务挂载 `content` 卷到 `/app/content`，这是 GeoGebra release 与业务数据的统一持久化目录。

### 8.2 更新任务

新增一个一次性 `ggb-updater` 服务（不常驻），由宿主机 cron 调度：

```bash
docker compose run --rm ggb-updater
```

示例命令：

```bash
docker compose run --rm \
  -e GGB_BUNDLE_URL=https://download.geogebra.org/package/geogebra-math-apps-bundle \
  ggb-updater sh -lc 'cd /app && node scripts/update_geogebra_bundle.js --url "$GGB_BUNDLE_URL"'
```

推荐在命令外层加互斥锁（如 `flock`）避免并发更新。

## 9. Kubernetes 落地建议

1. `Deployment physics-animations`：挂载 PVC 到 `/app/content`。
2. `CronJob ggb-updater`：复用同一镜像和 PVC，执行 update 命令。
3. `NetworkPolicy`：  
   - `app` 默认禁止外连（按需放行）  
   - `ggb-updater` 仅允许访问内网制品源或官方源
4. `ConfigMap/Secret` 管理更新 URL、鉴权、兜底开关。

## 10. 安全与运维

1. 更新任务使用最小权限账号，限制写路径到 `/app/content/library/vendor/geogebra`。
2. 建议记录下载文件摘要（SHA256）到 `manifest.json`（后续增强项）。
3. 监控项：
   - 最新 bundle 版本号
   - 最近一次更新是否成功
   - `current/deployggb.js` 与 `current/web3d/web3d.nocache.js` 可达性
4. 告警策略：连续 N 次更新失败触发通知。

## 11. 与现有实现的差距（待实施项）

1. 增加容器编排样例：`docker-compose` 中新增 `ggb-updater` 服务模板。
2. 增加调度说明：宿主机 cron / K8s CronJob 的标准配置示例。
3. 更新脚本增强：
   - 可选版本保留策略（`--retain`）
   - 可选摘要校验（`--sha256`）
   - 可选文件锁（避免并发）
4. 补充集成测试：
   - 模拟更新失败时不破坏 `current`
   - 模拟离线模式下 viewer 仅加载本地源

## 12. 验收标准

1. 重建 `app` 容器后，已上传 `.ggb` 及自托管 bundle 不丢失。
2. 定时任务可自动拉取新版本并切换 `current`。
3. 禁止外网后，`.ggb` `embed` 仍可从本地 bundle 打开。
4. 人工切回旧 release 后，页面可正常恢复。
