# 配置项参考（环境变量）

本文档集中列出常用环境变量。若你只想快速启动，可先保留默认值，后续按需调整。

## 基础运行

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `4173` | 服务监听端口 |
| `TRUST_PROXY` | 未设置 | 反向代理场景下建议按实际代理层数配置 |

## 管理员与鉴权

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | `admin` | 管理员明文密码（启动时会 hash） |
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

## 状态数据库（可选）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `STATE_DB_MODE` | `off` | 可选 `off` / `sqlite` |
| `STATE_DB_PATH` | `content/state.sqlite` | SQLite 文件路径 |
| `STATE_DB_MAX_ERRORS` | `3` | 连续错误熔断阈值 |

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
| `METRICS_PUBLIC` | `true` | 是否匿名访问 `/api/metrics`；设为 `false` 则需要登录 |

## 一个生产环境最小配置示例

```env
PORT=4173
ADMIN_USERNAME=your_admin
ADMIN_PASSWORD_HASH=your_bcrypt_hash
JWT_SECRET=replace_with_long_random_secret
METRICS_PUBLIC=false
```
