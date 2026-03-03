# 配置项参考（环境变量）

本文档集中列出常用环境变量。若你只想快速启动，可先保留默认值，后续按需调整。

## 基础运行

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `4173` | 服务监听端口 |
| `TRUST_PROXY` | 未设置 | 反向代理场景下建议按实际代理层数配置 |
| `LOG_LEVEL` | `info` | 日志级别：`debug` / `info` / `warn` / `error` |

## 管理员与鉴权

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ADMIN_USERNAME` | 未设置 | 不设置时会随机生成用户名（形如 `admin_xxxxxxxx`） |
| `ADMIN_PASSWORD` | 未设置 | 不设置且未提供 `ADMIN_PASSWORD_HASH` 时会随机生成密码并写入启动日志 |
| `ADMIN_PASSWORD_HASH` | 未设置 | 若设置，优先于 `ADMIN_PASSWORD` |
| `JWT_SECRET` | 未设置 | 强烈建议生产环境设置固定值 |
| `JWT_ISSUER` | `physicsAnimations` | JWT issuer |
| `JWT_AUDIENCE` | `physicsAnimations-web` | JWT audience |
| `JWT_TTL_SECONDS` | `28800` | token 有效期（秒） |

生成 bcrypt hash：

```bash
node -e 'const bcrypt=require("bcryptjs"); console.log(bcrypt.hashSync(process.argv[1],10))' "your_password"
```

## 存储（本地 / WebDAV）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `STORAGE_MODE` | `local` | 可选 `local` / `webdav` |
| `WEBDAV_URL` | 未设置 | WebDAV 根地址 |
| `WEBDAV_BASE_PATH` | `physicsAnimations` | WebDAV 子路径 |
| `WEBDAV_USERNAME` | 未设置 | WebDAV 账号 |
| `WEBDAV_PASSWORD` | 未设置 | WebDAV 密码 |
| `WEBDAV_TIMEOUT_MS` | `15000` | WebDAV 请求超时 |

说明：

- 必须显式设置 `STORAGE_MODE=webdav` 才会启用 WebDAV。
- 不再支持 `hybrid` / `mirror` / `local+webdav`。
- `STORAGE_MODE=webdav` 但未配置 `WEBDAV_URL` 时，服务会在启动时直接报错。

## 状态数据库（可选）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `STATE_DB_MODE` | `sqlite` | 可选 `off` / `sqlite` |
| `STATE_DB_PATH` | `content/state.sqlite` | SQLite 文件路径 |
| `STATE_DB_MAX_ERRORS` | `3` | 连续错误熔断阈值 |
| `STATE_DB_COOLDOWN_MS` | `30000` | 熔断后自动进入半开探测的冷却时间（毫秒） |

说明：

- 当前运行时默认启用 `sqlite` 状态数据库镜像（未设置 `STATE_DB_MODE` 时生效）。
- 如需关闭状态数据库镜像，请显式设置 `STATE_DB_MODE=off`。
- `STATE_DB_MODE` 仅支持 `off` / `sqlite`；非法非空值会在启动阶段直接失败（`invalid_state_db_mode`）。
- `STATE_DB_MODE` 不再接受 `false`、`disabled`、`0` 等历史别名。
- `STATE_DB_COOLDOWN_MS` 控制熔断打开后的自动恢复探测窗口；建议保持默认值并结合告警观察。
- 当前版本为单轨 SQL 读路径：内建 `sql_only`，不提供环境变量切换。
- SQL 读路径不可用时，读接口返回 `503 state_db_unavailable`，不再回退 JSON 读路径。
- 回滚方式：回滚到上一版本镜像或回滚对应提交。

## 任务队列与截图

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `TASK_QUEUE_CONCURRENCY` | `1` | 异步任务并发数 |
| `TASK_QUEUE_MAX` | `200` | 队列等待上限 |
| `TASKS_MAX` | `2000` | 内存中保留任务记录数 |
| `TASK_TIMEOUT_MS` | `90000` | 单任务超时 |
| `SCREENSHOT_CONCURRENCY` | `1` | 截图并发数 |
| `SCREENSHOT_QUEUE_MAX` | `50` | 截图队列上限 |

## 观测接口

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `METRICS_PUBLIC` | `false` | 是否匿名访问 `/api/metrics`；设为 `true` 可匿名访问 |

## GeoGebra 自托管（资源库）

> 适用于 `library` 中 `.ggb` 的 `embed` 打开模式。默认会先走内网自托管，再在线兜底。

兼容边界说明：

- 当前版本仅保留资源库 `embed` 场景的双源 fallback（自托管 + 在线兜底）。
- 除此之外不再保留其他历史兼容路径（如旧入口、旧模式别名、旧读路径回退）。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LIBRARY_GGB_SELF_HOST_SCRIPT_URL` | `/content/library/vendor/geogebra/current/deployggb.js` | 自托管 `deployggb.js` 地址 |
| `LIBRARY_GGB_SELF_HOST_HTML5_CODEBASE_URL` | `/content/library/vendor/geogebra/current/web3d/` | 自托管 `HTML5Codebase`（需以 `/` 结尾） |
| `LIBRARY_GGB_ENABLE_ONLINE_FALLBACK` | `true` | 自托管失败时是否允许在线兜底 |
| `LIBRARY_GGB_ONLINE_FALLBACK_SCRIPT_URL` | `https://www.geogebra.org/apps/deployggb.js` | 在线兜底脚本地址 |
| `LIBRARY_GGB_ONLINE_FALLBACK_HTML5_CODEBASE_URL` | 空 | 在线兜底时可选 codebase（通常留空） |

更新自托管包：

```bash
npm run update:geogebra-bundle
```

默认下载官方 `Math Apps Bundle`，并切换 `content/library/vendor/geogebra/current` 到最新 release。

高级参数示例（保留最近 3 个版本、启用 sha256 校验）：

```bash
node scripts/update_geogebra_bundle.js \
  --retain 3 \
  --sha256 <expected_sha256_hex>
```

## GeoGebra 更新任务（容器作业）

> 仅用于 `ggb-updater` 任务容器，不是主应用服务变量。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `GGB_BUNDLE_URL` | `https://download.geogebra.org/package/geogebra-math-apps-bundle` | bundle 下载地址（可替换为内网制品源） |
| `GGB_BUNDLE_VERSION` | 空 | 指定 release 名称，不填则从最终 URL 推断 |
| `GGB_BUNDLE_SHA256` | 空 | zip 的期望 SHA256（64 位十六进制） |
| `GGB_RETAIN_RELEASES` | `3` | 更新后保留最近版本数（`0` 表示不清理） |
| `GGB_BUNDLE_FORCE` | `false` | 是否覆盖同名 release |
| `GGB_NO_LOCK` | `false` | 是否禁用更新锁 |
| `GGB_LOCK_FILE` | 空 | 自定义锁文件路径（默认在 vendor 目录下） |
| `GGB_KEEP_TEMP` | `false` | 是否保留下载/解压临时目录 |

这些变量由 `scripts/run_geogebra_updater.sh` 读取，并转为 `update_geogebra_bundle.js` 参数。

## 一个生产环境最小配置示例

```env
PORT=4173
ADMIN_USERNAME=your_admin
ADMIN_PASSWORD_HASH=your_bcrypt_hash
JWT_SECRET=replace_with_long_random_secret
METRICS_PUBLIC=false
```
