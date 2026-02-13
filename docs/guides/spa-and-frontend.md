# 前端 SPA 与路由行为

这里记录前端相关命令、入口行为和回退策略，方便开发或排查路由问题。

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
npm run smoke:spa-legacy-fallback
```

这些脚本覆盖：

- 管理台登录、导航与退出
- 管理台写路径（创建、校验、删除）
- 公开页目录与预览流程
- 旧入口回退逻辑

## 路由挂载规则

构建成功后，服务端会自动挂载：

- `/app`（SPA 入口）
- `/app/*`（history fallback）
- `/app/assets/*`（前端静态资源）

## 默认入口策略

- 当 `frontend/dist/index.html` 存在且 `SPA_DEFAULT_ENTRY=true` 时：
  - `/` 与 `/index.html` 优先返回 SPA
  - `viewer.html?id=...` 会重定向到 `/app/viewer/:id`
- 当 SPA 构建产物缺失或显式配置 `SPA_DEFAULT_ENTRY=false` 时：
  - 自动回退旧版入口页

## 常见排查

1. `/app` 返回 `404`
原因通常是还没构建前端，先执行 `npm run build:frontend`。

2. 首页不是你预期的入口
检查 `SPA_DEFAULT_ENTRY` 是否被设置为 `false`。
