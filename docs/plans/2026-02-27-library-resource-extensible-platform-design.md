# Library 资源库（文件夹 + 可扩展平台适配器）设计

日期：2026-02-27  
状态：已确认（与需求方逐节对齐）

## 1. 背景与目标

当前项目动态内容模型以 `items` 为核心，仅支持 `link` 与 `upload(HTML/ZIP)`。需求新增“文件夹 + 演示文件”能力，首期聚焦 GeoGebra `.ggb`，并要求后续可扩展到其他“可通过容器页接入的平台”。

本设计目标：

1. 前台支持“文件夹卡片 -> 文件夹详情页 -> 资源打开/下载”完整链路。
2. 管理端支持创建文件夹、设置封面（空白或上传图）、上传 `.ggb` 资源。
3. 每个 `.ggb` 资源支持两种模式：
   - `embed`：自动生成容器页并在平台内打开。
   - `download`：不生成容器页，仅文件下载。
4. 架构层预留高扩展性：未来新增平台时，不改主流程，仅新增代码级 adapter。

## 2. 关键决策（已锁定）

1. 前台展示采用“可点击文件夹卡片”（不是仅后台容器）。
2. Phase 1 仅支持 `.ggb`。
3. `.ggb` 允许“生成容器页”或“仅下载”二选一。
4. 扩展机制采用“代码级插件注册（adapter registry）”。
5. 采用独立 `library` 域，不把文件夹硬塞进现有 `items`。

## 3. 范围与非目标

范围（Phase 1）：

1. 单层文件夹（保留 `parentId` 字段，但当前固定为 `null`）。
2. GeoGebra adapter（`.ggb`）接入。
3. 新增 `library` API 与前端页面。

非目标（Phase 1 不做）：

1. 多级文件夹树。
2. 管理端“动态配置 adapter 规则”。
3. 改造现有 `/api/items`、`/api/catalog` 语义。

## 4. 架构设计

### 4.1 领域拆分

新增并行领域 `library`，不破坏当前 `items` 主链路：

1. `folders`：目录实体，承载组织与封面展示。
2. `assets`：资源实体，属于某个文件夹。
3. `adapters`：平台适配器，决定文件识别、容器生成、预览行为。

### 4.2 核心原则

1. 旧链路稳定优先：`items(link/upload)` 不重构、不迁移。
2. 新链路独立演进：`library` 单独路由、服务、测试。
3. 行为由 adapter 驱动：主流程不关心平台细节。

## 5. 数据模型

### 5.1 folders

字段建议：

1. `id`
2. `name`
3. `categoryId`
4. `coverType`：`blank | image`
5. `coverPath`：仅 `image` 时有值
6. `parentId`：Phase 1 固定 `null`
7. `order`
8. `createdAt`
9. `updatedAt`

### 5.2 assets

字段建议：

1. `id`
2. `folderId`
3. `adapterKey`：如 `geogebra`
4. `fileName`
5. `filePath`
6. `fileSize`
7. `openMode`：`embed | download`
8. `generatedEntryPath`：`embed` 时可用
9. `status`：`ready | failed`
10. `createdAt`
11. `updatedAt`

### 5.3 adapter registry（代码级）

接口约定：

1. `match(input): boolean`
2. `ingest(input, options): Artifact`
3. `buildViewer(artifact, options): { entryPath?: string }`

Phase 1 内置 adapter：

1. `geogebra`：匹配 `.ggb`。
2. `openMode=embed` 时生成容器页（接入 GeoGebra app 脚本）。
3. `openMode=download` 时跳过容器页生成。

## 6. 存储布局

新增目录：

1. `content/library/folders.json`
2. `content/library/assets.json`
3. `content/library/covers/<folderId>.<ext>`
4. `content/library/assets/<assetId>/source/<original file>`
5. `content/library/assets/<assetId>/viewer/index.html`（仅 `embed`）

要求：

1. 状态文件与文件系统一致性由服务层保证。
2. 删除 folder/asset 时同步清理物理文件。

## 7. API 设计（新增）

### 7.1 folders

1. `POST /api/library/folders`
2. `PUT /api/library/folders/:id`
3. `DELETE /api/library/folders/:id`
4. `GET /api/library/folders/:id`
5. `GET /api/library/folders`
6. `POST /api/library/folders/:id/cover`

### 7.2 assets

1. `POST /api/library/folders/:id/assets`（multipart，含 `openMode`）
2. `GET /api/library/folders/:id/assets`
3. `GET /api/library/assets/:id`
4. `PUT /api/library/assets/:id`
5. `DELETE /api/library/assets/:id`

### 7.3 public catalog（library）

1. `GET /api/library/catalog`
2. 前端目录页并排展示：普通内容卡片 + 文件夹卡片。
3. 文件夹路由：`/library/folder/:id`。

## 8. 核心流程

### 8.1 创建文件夹

1. 管理端提交名称、分类、封面模式。
2. `coverType=image` 时上传封面图并写入 `coverPath`。

### 8.2 上传 `.ggb` 资源

1. 服务端根据扩展名匹配 adapter（当前仅 `geogebra`）。
2. 文件写入 `source/`。
3. 若 `openMode=embed`，调用 adapter 生成 `viewer/index.html`。
4. 写入 `assets.json`。
5. 返回 `openUrl/downloadUrl`。

### 8.3 前台打开资源

1. 前台请求 `GET /api/library/assets/:id`。
2. `openMode=embed`：进入容器页。
3. `openMode=download`：直接下载源文件。

## 9. 错误处理与安全

建议错误码：

1. `unsupported_asset_type`
2. `adapter_not_found`
3. `adapter_render_failed`
4. `folder_not_found`
5. `asset_not_found`
6. `folder_not_empty`
7. `cover_invalid_type`
8. `invalid_open_mode`

安全策略：

1. 扩展名/MIME 白名单。
2. 文件大小上限与文件名规范化（防目录穿越）。
3. 所有路径服务端生成，不信任客户端路径字段。
4. 封面图做类型与尺寸限制。
5. 采用“临时目录 -> 原子落盘 -> 状态写入”三段流程，失败即回滚清理。

## 10. 测试策略

### 10.1 单元测试

1. adapter registry 注册与匹配。
2. `geogebra` adapter 的容器页生成逻辑。
3. 文件路径规范化与白名单校验。

### 10.2 服务测试

1. 文件夹 CRUD。
2. `.ggb` 上传（`embed`/`download` 两模式）。
3. 删除策略（默认非空文件夹不可删）。
4. 权限校验与错误码契约。

### 10.3 前端测试

1. 文件夹卡片渲染与跳转。
2. 文件夹详情列表与资源打开行为。
3. 上传反馈与错误提示。

## 11. 迭代建议

1. 先完成 `library` 后端闭环（API + adapter + 存储一致性）。
2. 再接管理端上传与文件夹管理 UI。
3. 最后接前台目录融合与详情页。
4. 稳定后新增第二个 adapter，验证扩展模型可靠性。
