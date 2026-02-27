# 前端 SPA 与路由行为

这里记录前端相关命令和当前唯一入口行为，方便开发或排查路由问题。

## 常用命令

```bash
# 本地开发
npm run dev:frontend

# 构建产物
npm run build:frontend

# 前端测试
npm run test:frontend
```

## 冒烟脚本

```bash
npm run smoke:spa-admin
npm run smoke:spa-admin-write
npm run smoke:spa-public
```

这些脚本覆盖：

- 管理台登录、导航与退出
- 管理台写路径（创建、校验、删除）
- 公开页目录与预览流程

## 路由挂载规则

构建成功后，服务端会自动挂载：

- `/`（SPA 入口）
- `/<frontend-route>`（history fallback，例如 `/viewer/:id`、`/admin/*`）
- `/assets/*`（前端静态资源）

## Legacy 路由策略

- 以下旧入口已下线，统一返回 `404`：
  - `/index.html`
  - `/viewer.html`
  - `/app` 与 `/app/*`

## 常见排查

1. `/` 返回 `503 service_unavailable`  
通常是还没构建前端，先执行 `npm run build:frontend`。

2. 访问旧链接（如 `/viewer.html?id=...`）报 `404`  
这是硬切换后的预期行为，请改用 `/viewer/:id` 路由。

## 前端 API 契约边界（Extensibility Phase 1）

管理端 API 调用层已增加契约解析与类型边界：

- `frontend/src/features/admin/adminTypes.ts`
- `frontend/src/features/admin/adminContracts.ts`
- `frontend/src/features/admin/adminApi.ts`

当前约束：

- `listAdminItems` 统一通过 `parseAdminItemsResponse` 返回稳定结构
- 非 2xx 响应统一通过 `toApiError` 转为带 `status/code/data` 的错误对象
- 该改造不改变后端协议，只收敛前端类型与错误处理语义

## Admin 页面模块边界（Refactor 2026-02-27）

### Content / Uploads

- 页面壳层：
  - `frontend/src/views/admin/AdminContentView.vue`
  - `frontend/src/views/admin/AdminUploadsView.vue`
- 状态与动作：
  - `frontend/src/features/admin/content/useContentAdmin.ts`
  - `frontend/src/features/admin/uploads/useUploadAdmin.ts`
- 子面板：
  - `frontend/src/views/admin/content/*`
  - `frontend/src/views/admin/uploads/*`

### Library

- 页面壳层：`frontend/src/views/admin/AdminLibraryView.vue`
- 状态 façade：`frontend/src/features/library/useLibraryAdminState.ts`
- 列与面板：`frontend/src/views/admin/library/*`

### Taxonomy / System

- 页面壳层：
  - `frontend/src/views/admin/AdminTaxonomyView.vue`
  - `frontend/src/views/admin/AdminSystemView.vue`
- 状态与向导：
  - `frontend/src/features/admin/taxonomy/useTaxonomyAdmin.ts`
  - `frontend/src/features/admin/system/useSystemWizard.ts`
- 子面板：
  - `frontend/src/views/admin/taxonomy/*`
  - `frontend/src/views/admin/system/*`

## 维护约束

- `frontend/src/views/admin/*.vue` 建议保持在 ~700 LOC 以内。
- 页面文件只负责编排，业务状态/异步动作优先放到对应 composable。
- 可复用的表单反馈逻辑优先复用：
  - `frontend/src/features/admin/composables/useFieldErrors.ts`
  - `frontend/src/features/admin/composables/useActionFeedback.ts`
  - `frontend/src/features/admin/composables/usePagedAdminList.ts`
