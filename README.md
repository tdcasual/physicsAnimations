# physicsAnimations

一个用于展示高中物理动画（本地 HTML）与网页收藏（外链）的轻量站点：支持分类浏览、缩略图自动截图、全屏预览页，以及登录后的上传/外链管理。

## 功能

- 分类标签页 + 搜索
- 卡片缩略图（自动截图生成）
- 统一的预览页 `viewer.html`：先展示截图（带动效）再加载页面
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
- 上传 ZIP：选择一个 `.zip` 文件（建议把 `index.html` 放在压缩包根目录；如在子目录也可自动识别；仅支持常见静态资源类型）
- 外链：在「添加网页链接」中填写 `http(s)://...`
- 内容管理：支持分页/搜索、编辑 `published/hidden/order` 与标题/描述/分类
- 分类管理：支持新增分类、排序、隐藏分类

添加成功后会自动截图，并在首页卡片与 `viewer.html` 中展示。

## API（MVP）

- `GET /api/catalog`：返回内置动画 + 登录后新增内容的合并目录（前端主要使用）
  - 会自动应用分类配置（排序/隐藏）
  - 仅返回 `published=true && hidden=false` 的新增内容
- `GET /api/categories`：返回分类列表（含数量）
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

分类管理（需要登录）：

- `POST /api/categories`：创建分类配置（用于新增分类/覆盖内置分类）
- `PUT /api/categories/:id`：更新分类配置（`title/order/hidden`）
- `DELETE /api/categories/:id`：删除分类配置（恢复默认显示）

兼容旧接口：
- `POST /api/items/link`
- `POST /api/items/upload`

## 配置（环境变量）

服务端支持通过环境变量覆盖默认配置：

- `PORT`：服务端口（默认 `4173`）
- `ADMIN_USERNAME`：管理员用户名
- `ADMIN_PASSWORD_HASH`：管理员密码的 bcrypt hash
- `JWT_SECRET`：登录 token 签名密钥（不设置则每次启动随机生成，重启会自动失效）
- `STORAGE_MODE`：存储模式（默认 `local`，可设为 `webdav`）
- `WEBDAV_URL`：WebDAV 根地址（例如 `https://example.com/dav/`）
- `WEBDAV_BASE_PATH`：WebDAV 下的存储目录（默认 `physicsAnimations`）
- `WEBDAV_USERNAME` / `WEBDAV_PASSWORD`：WebDAV 账号密码（如服务端需要）
- `WEBDAV_TIMEOUT_MS`：WebDAV 请求超时（默认 `15000`）

生成 bcrypt hash 示例：

```bash
node -e 'const bcrypt=require("bcryptjs"); console.log(bcrypt.hashSync(process.argv[1],10))' "your_password"
```

## WebDAV（存储与备份）

当你配置了 WebDAV（设置 `STORAGE_MODE=webdav` 或提供 `WEBDAV_URL`），服务端会把以下运行时数据放到 WebDAV：

- `content/items.json`、`content/categories.json`
- `content/uploads/`（上传 HTML/ZIP 解压后的目录）
- `content/thumbnails/`（动态内容缩略图）

把本地 `content/` 备份到 WebDAV：

```bash
npm run backup:webdav
```

## 部署

### Vercel（Serverless）

仓库已提供 `vercel.json` + `api/index.js`。注意：Vercel 文件系统不可持久写入，建议启用 WebDAV 存储：

- 在 Vercel 项目环境变量中设置：`STORAGE_MODE=webdav`、`WEBDAV_URL`、`WEBDAV_USERNAME/WEBDAV_PASSWORD`（如需要）
- 部署后访问站点即可
- 部分 Serverless 环境可能无法运行 Playwright（缩略图生成会失败但不影响上传/访问，可后续在可运行 Playwright 的环境补截图）

### 通用云函数（AWS Lambda / Netlify Functions 等）

仓库提供 `serverless-handler.js`（基于 `serverless-http`）作为通用入口，你可以在目标平台将其作为 handler 使用，并同样建议配置 WebDAV 作为持久化存储。

## 目录结构

- `index.html`：主页（分类 + 搜索 + 登录/管理）
- `viewer.html`：预览页（截图动效 + iframe）
- `animations/`：内置动画页面（按分类目录组织）
- `animations/thumbnails/`：内置动画缩略图（自动生成）
- `content/`：登录后上传/外链的运行时数据（默认已加入 `.gitignore`）
- `server/`：后端（登录、上传、外链、截图、目录合并）
- `scripts/`：工具脚本（生成缩略图/清单、安装 Playwright 本地依赖）

## 建议

- 目前为单管理员模式，建议仅在内网/本机使用；如需公网部署，建议增加多用户/权限/审计与更严格的上传策略。
- “上传网页”支持单 HTML 或 ZIP（解压到独立目录）；如需更复杂的资源/跨域请求，需评估并调整 CSP/沙箱策略。
- 外链站点可能因 `X-Frame-Options` 无法嵌入，可在预览页增加“仅截图模式/自动降级提示”。
- 可扩展批量导入/导出（JSON）、标签/收藏夹、排序与置顶等管理能力。
- 可以从每个动画 HTML 的 `<title>`/`<meta name="description">` 自动提取标题与描述，减少手工维护。

## 安全说明（当前实现）

- 预览页 iframe 使用最小化 `sandbox`（仅 `allow-scripts`），并设置 `referrerpolicy="no-referrer"`。
- 上传 HTML 会做基础清洗（移除外部 `script src`、外链样式、`form/base/iframe` 等标签），并注入 CSP（禁外部脚本/连接/表单提交）。
- 服务端截图（Playwright）对网络请求做 SSRF 防护：阻止访问 localhost/私有网段/`.local` 等。
- 写入类接口带简单的内存限流（登录、写入、截图）。
