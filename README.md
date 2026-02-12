# physicsAnimations

一个用于展示高中物理动画（本地 HTML）与网页收藏（外链）的轻量站点：支持分类浏览、缩略图自动截图、全屏预览页，以及登录后的上传/外链管理。

## 功能

- 分类标签页 + 搜索
- 卡片缩略图（自动截图生成）
- 统一的预览页 `viewer.html`：先展示截图（带动效）再加载页面
- 上传内容编码自动处理（统一保存为 UTF-8，兼容常见中文编码）
- 单 HTML 上传支持自动下载外部 JS/CSS 依赖（例如 Three.js CDN），保存为本地文件后再预览
- 管理员登录后：
  - 上传 HTML（单文件）
  - 上传 ZIP（解压到独立目录，需包含 `index.html`）
  - 添加外部网页链接
  - 删除已添加内容

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2)（推荐）安装截图所需的本地依赖（无需 sudo）

如果你运行截图相关功能时报错（例如缺少 `libnspr4.so` / `libnss3.so`），执行：

```bash
npm run install-playwright-deps
```

### 3) 启动（带管理功能）

```bash
npm start
```

默认端口：`http://localhost:4173`（请通过这个地址访问，不要直接双击打开 `index.html` 文件）

如果登录提示“尝试过于频繁”，说明触发了接口限流；等待提示的秒数后再试即可（开发环境也可重启服务清空内存限流状态）。

默认管理员账号：`admin` / `admin`（建议部署后立即修改）。

## 生成/更新动画清单与缩略图

当你在 `animations/<分类>/` 目录新增/修改 HTML 后，建议执行：

```bash
npm run build-catalog
```

它会：

1. 扫描 `animations/` 生成 `animations.json`
2. 对每个本地 HTML 自动截图到 `animations/thumbnails/...`
3. 再次更新 `animations.json`，把缩略图路径写回去

## 管理功能说明

访问首页后点击右上角「登录」进入管理模式：

- 上传：在「上传 HTML」中选择一个 `.html/.htm` 文件
- 如果 HTML 依赖外部 CDN（`<script src="https://...">` / `<link rel="stylesheet" href="https://...">`），服务端会尝试下载并改写为本地文件；失败时建议改用 ZIP（把依赖一并打包）
- 如你在旧版本中上传过依赖 CDN 的单 HTML，因当时会移除外部脚本，页面可能无法运行；更新后请用原始文件重新上传一次
- 上传 ZIP：选择一个 `.zip` 文件（建议把 `index.html` 放在压缩包根目录；如在子目录也可自动识别；仅支持常见静态资源类型）
- 外链：在「添加网页链接」中填写 `http(s)://...`
- 内容管理：支持分页/搜索、编辑 `published/hidden/order` 与标题/描述/分类
- 分类管理：支持管理「大类 / 二级分类」的新增、排序、隐藏，并可调整二级分类所属大类

添加成功后会自动截图，并在首页卡片与 `viewer.html` 中展示。

## API（MVP）

- `GET /api/catalog`：返回内置动画 + 登录后新增内容的合并目录（前端主要使用）
  - 返回结构为 `groups -> categories -> items`
  - 会自动应用大类/二级分类配置（排序/隐藏）
  - 仅返回 `published=true && hidden=false` 的新增内容
- `GET /api/categories`：返回大类/二级分类列表（含数量）
  - 未登录：仅返回未隐藏分类
  - 已登录：额外包含隐藏分类与“仅配置但暂无内容”的分类
- `GET /api/items`：返回登录后新增内容（支持 `q/categoryId/type/page/pageSize`）
  - 未登录：仅返回 `published=true && hidden=false`
  - 已登录：返回全部（用于管理面板分页/搜索）
- `POST /api/items`：创建内容（需要登录）
  - JSON：`{ "type":"link", "url":"https://...", "categoryId":"...", "title":"", "description":"" }`
  - multipart：上传 HTML/ZIP（字段：`file/categoryId/title/description`）
- `PUT /api/items/:id`：更新内容（需要登录）
  - 支持：`title/description/categoryId/order/published/hidden`
- `DELETE /api/items/:id`：删除（需要登录）
- `GET /api/items/:id`：获取单条内容（预览页用）
  - 未登录：仅能获取 `published=true && hidden=false`
  - 已登录：可获取全部
- `POST /api/items/:id/screenshot`：重新截图（需要登录）
  - 当前返回 `202 Accepted`，并返回 `task`
- `GET /api/tasks/:taskId`：查询异步任务状态（需要登录）
- `POST /api/tasks/:taskId/retry`：重试失败任务（需要登录）
- 默认启用任务状态持久化（`content/tasks.json`），服务重启后可恢复

分类管理（需要登录）：

- `POST /api/groups`：创建大类
- `PUT /api/groups/:id`：更新大类配置（`title/order/hidden`）
- `DELETE /api/groups/:id`：删除/重置大类配置（非默认大类需保证其下无二级分类）

- `POST /api/categories`：创建二级分类（需要 `groupId`）
- `PUT /api/categories/:id`：更新二级分类配置（`groupId/title/order/hidden`）
- `DELETE /api/categories/:id`：删除二级分类配置（恢复默认显示）

兼容旧接口：
- `POST /api/items/link`
- `POST /api/items/upload`

## 配置（环境变量）

服务端支持通过环境变量覆盖默认配置：

- `PORT`：服务端口（默认 `4173`）
- `ADMIN_USERNAME`：管理员用户名（默认 `admin`）
- `ADMIN_PASSWORD`：管理员密码（明文，启动时自动 hash；默认 `admin`）
- `ADMIN_PASSWORD_HASH`：管理员密码的 bcrypt hash（如果设置则优先生效）
- `STORAGE_MODE`：存储模式（默认 `local`，可设为 `webdav`）
- `WEBDAV_URL`：WebDAV 根地址（例如 `https://example.com/dav/`）
- `WEBDAV_BASE_PATH`：WebDAV 下的存储目录（默认 `physicsAnimations`）
- `WEBDAV_USERNAME` / `WEBDAV_PASSWORD`：WebDAV 账号密码（如服务端需要）
- `WEBDAV_TIMEOUT_MS`：WebDAV 请求超时（默认 `15000`）
- `STATE_DB_MODE`：状态数据库模式（`off`/`sqlite`，默认 `off`）
- `STATE_DB_PATH`：状态数据库文件路径（默认 `content/state.sqlite`）
- `METRICS_PUBLIC`：是否公开 `GET /api/metrics`（默认 `false`，建议保持关闭）
- `TASK_QUEUE_CONCURRENCY`：异步任务并发数（默认 `1`）
- `TASK_QUEUE_MAX`：任务等待队列长度上限（默认 `200`）
- `TASKS_MAX`：内存中保留的任务记录上限（默认 `2000`）
- `TASK_TIMEOUT_MS`：单任务执行超时（默认 `90000`）
- `STATE_DB_MAX_ERRORS`：SQLite 连续失败熔断阈值（默认 `3`）

生成 bcrypt hash 示例：

```bash
node -e 'const bcrypt=require("bcryptjs"); console.log(bcrypt.hashSync(process.argv[1],10))' "your_password"
```

## WebDAV（存储与备份）

当你配置了 WebDAV（设置 `STORAGE_MODE=webdav` 或提供 `WEBDAV_URL`），服务端会把以下运行时数据放到 WebDAV：

- `content/items.json`、`content/categories.json`、`content/builtin_items.json`
- `content/uploads/`（上传 HTML/ZIP 解压后的目录）
- `content/thumbnails/`（动态内容缩略图）

把本地 `content/` 备份到 WebDAV：

```bash
npm run backup:webdav
```

## 状态数据库（C 路线第 1 阶段）

当前支持可选 SQLite 状态镜像层（默认关闭）：

- 开启：`STATE_DB_MODE=sqlite`
- 路径：默认 `content/state.sqlite`，可通过 `STATE_DB_PATH` 覆盖
- 覆盖范围：`items.json`、`categories.json`、`builtin_items.json`、`items_tombstones.json`、`admin.json`

说明：

- 该能力为兼容增强，不改变现有 JSON / WebDAV 主流程
- 读路径支持读穿透缓存，写路径同步镜像到 SQLite
- 当连续 SQL/镜像错误达到阈值时会自动熔断并回退到 JSON 路径（阈值由 `STATE_DB_MAX_ERRORS` 控制）
- 可在 `GET /api/system`（需登录）与 `GET /api/metrics`（默认需登录）查看 `stateDb` 状态

## SQL 查询下推（C 路线第 3 阶段，进行中）

当 `STATE_DB_MODE=sqlite` 开启时：

- `GET /api/items` 优先走 SQLite merged 查询（动态+内置统一过滤/排序/分页）
- merged 查询不可用时，会回退到动态/内置分离 SQL 路径
- `GET /api/items/:id` 的动态内容详情查询优先走 SQLite
- `GET /api/items/:id` 的内置内容详情可选走 SQLite builtin 索引表
- `GET /api/categories` 的动态内容计数优先走 SQLite 分类聚合（保留原有 taxonomy 语义）
- `GET /api/catalog` 的动态项读取优先走 SQLite（保留原有分组/分类/排序语义）
- `items` 相关 SQL 语句按模板复用 `prepare`，减少高频查询编译开销
- merged 列表查询增加排序索引（`created_at/title/id` 与 `deleted/title/id`）
- 内置内容（builtin）仍保留现有合并逻辑，以保证兼容性
- 若 SQL 查询不可用，会自动回退到原有 JSON 内存过滤路径

## 部署

### Docker（自托管）

构建镜像：

```bash
docker build -t physics-animations:latest .
```

启动容器（本地存储模式，建议挂载 `content/` 以持久化上传/配置）：

```bash
docker run -d --name physics-animations \
  -p 4173:4173 \
  -v "$(pwd)/content:/app/content" \
  -e PORT=4173 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD='admin' \
  physics-animations:latest
```

说明：

- 默认端口为 `4173`，可用 `-e PORT=xxxx` 覆盖
- 不挂载 `content/` 时，容器重建会丢失上传内容与配置
- 镜像内已安装 Playwright Chromium 与系统依赖，用于上传后自动截图；如不需要截图可自行修改 `Dockerfile` 去掉该步骤

### Docker Compose（推荐）

使用 GitHub Container Registry（GHCR）镜像：

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

### Vercel（Serverless）

仓库已提供 `vercel.json` + `api/index.js`。

注意：Vercel Serverless 文件系统不可持久写入（且可能是只读），因此**不要依赖本地 `content/`**，强烈建议使用 WebDAV 作为运行时存储。

建议在 Vercel 项目环境变量中配置（至少）：

- 存储（必配）
  - `STORAGE_MODE=webdav`
  - `WEBDAV_URL`（必配）
  - `WEBDAV_USERNAME` / `WEBDAV_PASSWORD`（如 WebDAV 需要鉴权）
  - 可选：`WEBDAV_BASE_PATH`（默认 `physicsAnimations`）、`WEBDAV_TIMEOUT_MS`
- 鉴权（强烈建议）
  - `JWT_SECRET`（必配）：Serverless 无法写入 `content/.jwt_secret` 时会使用临时密钥，导致重启/冷启动后旧 token 全部失效
  - `ADMIN_USERNAME`（可选，默认 `admin`）
  - `ADMIN_PASSWORD_HASH`（推荐）或 `ADMIN_PASSWORD`（明文；不推荐，默认 `admin`）

说明：

- 若运行在只读文件系统下，Web UI 的「系统设置」可能无法持久保存（请以环境变量为准）
- 部分 Serverless 环境可能无法运行 Playwright（缩略图生成会失败但不影响上传/访问，可后续在可运行 Playwright 的环境补截图）


### 通用云函数（AWS Lambda / Netlify Functions 等）

仓库提供 `serverless-handler.js`（基于 `serverless-http`）作为通用入口，你可以在目标平台将其作为 handler 使用，并同样建议配置 WebDAV 作为持久化存储。

## 目录结构

- `index.html`：主页（分类 + 搜索 + 登录/管理）
- `viewer.html`：预览页（截图动效 + iframe）
- `animations/`：内置动画页面（按分类目录组织）
- `animations/thumbnails/`：内置动画缩略图（自动生成）
- `content/`：登录后上传/外链与内置条目配置的运行时数据（默认已加入 `.gitignore`）
- `server/`：后端（登录、上传、外链、截图、目录合并）
- `scripts/`：工具脚本（生成缩略图/清单、安装 Playwright 本地依赖）

## 建议

- 目前为单管理员模式，建议仅在内网/本机使用；如需公网部署，建议增加多用户/权限/审计与更严格的上传策略。
- “上传网页”支持单 HTML 或 ZIP（解压到独立目录）；如需更复杂的资源/跨域请求，需评估并调整 CSP/沙箱策略。
- 外链站点默认直接加载原站点；若因 `X-Frame-Options` / CSP 无法嵌入，可在预览页切换“仅截图”或点“打开原页面”。
- 可扩展批量导入/导出（JSON）、标签/收藏夹、排序与置顶等管理能力。
- 可以从每个动画 HTML 的 `<title>`/`<meta name="description">` 自动提取标题与描述，减少手工维护。

## 安全说明（当前实现）

- 预览页 iframe 使用最小化 `sandbox`（仅 `allow-scripts`），并设置 `referrerpolicy="no-referrer"`。
- 上传 HTML 支持自动下载外部 JS/CSS 依赖并改写为本地引用（仅允许公共 `http(s)` 地址，且限制数量/大小），以提升离线可用性。
- 服务端截图（Playwright）对网络请求做 SSRF 防护：阻止访问 localhost/私有网段/`.local` 等。
- 写入类接口带简单的内存限流（登录、写入、截图）。
