# physicsAnimations

一个用于展示高中物理动画（本地 HTML）与网页收藏（外链）的轻量站点：支持分类浏览、缩略图自动截图、全屏预览页，以及登录后的上传/外链管理。

## 功能

- 分类标签页 + 搜索
- 卡片缩略图（自动截图生成）
- 统一的预览页 `viewer.html`：先展示截图（带动效）再加载页面
- 管理员登录后：
  - 上传 HTML（单文件）
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

默认端口：`http://localhost:4173`

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
- 外链：在「添加网页链接」中填写 `http(s)://...`

添加成功后会自动截图，并在首页卡片与 `viewer.html` 中展示。

## 配置（环境变量）

服务端支持通过环境变量覆盖默认配置：

- `PORT`：服务端口（默认 `4173`）
- `ADMIN_USERNAME`：管理员用户名
- `ADMIN_PASSWORD_HASH`：管理员密码的 bcrypt hash
- `JWT_SECRET`：登录 token 签名密钥（不设置则每次启动随机生成，重启会自动失效）

生成 bcrypt hash 示例：

```bash
node -e 'const bcrypt=require("bcryptjs"); console.log(bcrypt.hashSync(process.argv[1],10))' "your_password"
```

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
- “上传网页”目前为单 HTML 文件；如需带资源的网页，建议增加 ZIP 上传并解压到独立目录（并做好安全隔离）。
- 外链站点可能因 `X-Frame-Options` 无法嵌入，可在预览页增加“仅截图模式/自动降级提示”。
- 可扩展批量导入/导出（JSON）、标签/收藏夹、排序与置顶等管理能力。
- 可以从每个动画 HTML 的 `<title>`/`<meta name="description">` 自动提取标题与描述，减少手工维护。
