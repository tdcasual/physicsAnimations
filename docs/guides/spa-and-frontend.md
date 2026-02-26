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
