# 前端架构文档

## 项目概述

物理动画演示系统前端，基于 Vue 3 + TypeScript + Vite 构建。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.5 (Composition API) |
| 语言 | TypeScript 5.9 |
| 构建 | Vite 7 |
| 状态管理 | Pinia 3 |
| 路由 | Vue Router 5 |
| 测试 | Vitest 4 + Playwright |
| 样式 | CSS Variables + Scoped CSS |
| 国际化 | Vue I18n 9 |

## 目录结构

```
src/
├── components/          # Vue 组件
│   ├── ui/             # 通用 UI 组件
│   ├── admin/          # 管理后台组件
│   ├── catalog/        # 目录页组件
│   └── viewer/         # 播放器组件
├── views/              # 页面视图
│   └── admin/          # 管理后台视图
├── features/           # 业务功能模块
│   ├── auth/           # 认证
│   ├── catalog/        # 目录
│   ├── admin/          # 管理后台
│   ├── library/        # 资源库
│   └── shared/         # 共享模块
├── composables/        # 组合式函数
├── stores/             # Pinia 状态管理
├── router/             # 路由配置
├── i18n/               # 国际化
├── directives/         # 自定义指令
├── utils/              # 工具函数
└── monitoring/         # 监控
```

## 架构原则

### 1. 功能模块组织 (Feature-Based)

业务逻辑按功能模块组织，每个模块包含：
- `composables/` - 组合式函数
- `types.ts` - 类型定义
- `*.ts` - 业务逻辑

### 2. 状态管理

使用 Pinia 进行状态管理：
- `stores/auth.ts` - 认证状态
- `stores/catalog.ts` - 目录状态
- `stores/admin/*.ts` - 管理后台状态

### 3. 组件设计

#### UI 组件 (Presentational)
位于 `components/ui/`，无业务逻辑：
- PButton - 按钮
- PInput - 输入框
- PModal - 模态框
- PCard - 卡片
- PEmpty - 空状态

#### 业务组件 (Container)
位于 `features/**/components/`，包含业务逻辑。

### 4. 代码分割

```typescript
// 路由懒加载
const AdminDashboardView = () =>
  import('../views/admin/AdminDashboardView.vue')

// 手动分包
// vite.config.ts
manualChunks: {
  'admin-core': ['./src/views/admin/AdminLayoutView.vue']
}
```

### 5. 类型定义

```typescript
// 业务类型放在 features 模块
interface CatalogItem {
  id: string
  title: string
  // ...
}

// API 类型
interface ApiResponse<T> {
  data: T
  status: number
}
```

## 性能优化

### 已实施
- ✅ 路由懒加载
- ✅ 代码分割 (admin-core chunk)
- ✅ PWA + Service Worker
- ✅ 图片懒加载 (v-lazy)
- ✅ 虚拟滚动 (VirtualList)

### 监控
- Web Vitals (CLS, INP, FCP, LCP, TTFB)
- Sentry 错误追踪

## 测试策略

| 类型 | 工具 | 范围 |
|------|------|------|
| 单元测试 | Vitest | composables, utils, stores |
| 组件测试 | Vitest + @vue/test-utils | UI 组件 |
| E2E 测试 | Playwright | 核心用户流程 |
| 视觉测试 | Storybook | 组件文档 |

## 代码规范

- ESLint 10 + Prettier 3
- TypeScript 严格模式
- Husky + lint-staged 预提交检查

## 环境变量

```
VITE_API_BASE_URL=/api
VITE_SENTRY_DSN=...
VITE_ANALYTICS_ENDPOINT=/api/analytics
```

## 构建

```bash
npm run build        # 生产构建
npm run typecheck    # 类型检查
npm run lint         # 代码检查
npm run test         # 运行测试
```
