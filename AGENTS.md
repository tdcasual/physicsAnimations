# AGENTS.md — 演示工坊 (physics-animations)

> 本项目为面向物理/科学教育的互动演示集 SPA。本文档为 AI Agent 提供项目级上下文、架构约定与决策记录。

---

## 1. 项目背景

- **产品定位**：精选多学科互动演示（GeoGebra、HTML5 Canvas、外链嵌入），面向教师课堂演示与学生自学。
- **部署形态**：单页应用 (SPA) + Express REST API，支持 Docker 自托管与 Vercel Serverless。
- **内容管理**：管理员后台支持分类/标签管理、资源库文件夹、素材上传、嵌入配置同步。

---

## 2. 技术栈版本锁定

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 运行时 | Node.js | >= 24 | `.nvmrc` / `package.json#engines` 锁定 |
| 框架 | Vue | 3.5.32 | `<script setup>` + Composition API |
| 路由 | vue-router | 5.0.4 | 历史模式，Hash 滚动行为自定义 |
| 状态 | Pinia | 3.0.4 | 仅 auth store 使用持久化 |
| 构建 | Vite | 7.3.2 | PWA + Workbox `generateSW` |
| 样式 | Tailwind CSS | v4 | `@tailwindcss/vite` 插件 |
| UI 组件 | shadcn-vue + reka-ui | 2.9.6 | 底层依赖 `radix-vue`、`@floating-ui` |
| 动画 | GSAP | 3.15.0 | 懒加载 + ScrollTrigger，尊重 `prefers-reduced-motion` |
| 测试 | Vitest | 4.1.4 | jsdom 环境，v8 coverage |
| Lint | ESLint | 10.2.0 | Flat Config，`eslint-plugin-import-x` |

---

## 3. 测试策略

### 3.1 运行方式
```bash
# 前端（frontend 目录）
npm test              # Vitest + jsdom
npm run typecheck     # vue-tsc --noEmit
npm run lint          # eslint src --ext .ts,.tsx,.vue

# 后端（根目录）
npm test              # Node Test Runner (node --test)
```

### 3.2 覆盖率阈值
```json
{
  "lines": 60,
  "functions": 60,
  "branches": 50,
  "statements": 60
}
```

### 3.3 测试分层
- **单元测试**：纯函数、组合式逻辑、API mappers/payloads（`test/*-test.ts`）
- **组件集成测试**：使用 `@vue/test-utils` 挂载 `CatalogView`、`ViewerView` 等核心视图，mock `fetch` 和 `vue-router`
- **可维护性预算测试**：检查关键 composable 不超过行数上限（如 `useCatalogViewState` < 340 行）
- **后端契约测试**：API 路由、auth 流程、文件行数预算

### 3.4 Mock 规范
- `fetch`：在测试级别 mock `globalThis.fetch`，每个 `afterEach` 恢复
- `localStorage`：通过 `test/node-localstorage-shim.mjs` 在 Vitest 启动时注入内存实现
- `matchMedia`：`test/setup.ts` 提供默认 mock，测试可局部 `vi.spyOn(window, "matchMedia")` 覆盖
- `vue-router`：组件测试使用 `createMemoryHistory` + `createRouter`，通过 `global.plugins` 注入

---

## 4. PWA 配置约定

- **模式**：`vite-plugin-pwa` + Workbox `generateSW`
- **Precache**：`globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]`，约 41 个条目
- **API 缓存**：`NetworkFirst`，15 分钟 TTL，默认仅匹配 GET（Workbox 路由默认行为）
- **字体缓存**：Google Fonts / gstatic 缓存 1 年
- **Chunk 拆分**：Vite `manualChunks` 将第三方库拆分为 `vendor-ui`、`vendor-utils`、`vendor-icons`

---

## 5. 安全头变更日志

| 日期 | 变更 | 文件 | 说明 |
|------|------|------|------|
| 2026-04 | 新增 SPA CSP | `server/middleware/securityHeaders.js` | 为所有非 API/静态资源路由添加 `Content-Security-Policy` |
| 2026-04 | iframe 安全加固 | `ViewerStageShell.vue` | 添加 `allow="fullscreen"` |
| 2026-04 | 序列化漏洞修复 | `frontend/package.json#overrides` | `serialize-javascript` 强制 `^7.0.5` |
| 2026-04 | tmp 漏洞修复 | `frontend/package.json#overrides` | `tmp` 强制 `^0.2.4`（修复 `@lhci/cli` 深层依赖） |
| 2026-04 | 全局错误边界 | `App.vue` | `onErrorCaptured` + `AppErrorBoundary.vue` 防止白屏 |
| 2026-04 | 请求取消 | `useRouteAbortController.ts` | 组件卸载时自动 `AbortSignal.abort()` |

### 当前 CSP 策略（SPA 路由）
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' /api/;
frame-src 'self' /content/ https:;
manifest-src 'self';
```

---

## 6. 已知低风险项

1. **`@lhci/cli` 4 个 low severity 漏洞**
   - **来源**：`@lhci/cli@0.15.1` → `inquirer` → `external-editor` → `tmp@<=0.2.3`（GHSA-52f5-9888-hmc6）
   - **缓解**：通过 `frontend/package.json#overrides` 强制 `tmp` 解析到 `0.2.4`（已修复版本）
   - **影响范围**：仅 Lighthouse CI 工具链，不影响生产运行时
   - **状态**：✅ `npm audit` 0 vulnerabilities

2. **Admin 面板对比度（light mode）**
   - 部分 admin 组件在 light mode 下可能未完全通过 WCAG 2.1 AA 对比度标准
   - 已引入 `guardAdminContrast.js` 进行自动化检查，持续修复中

3. **PWA `theme-color` 固定为 `#ffffff`**
   - 已通过 `useTheme.ts` 动态更新 `meta[name="theme-color"]` 为 `#1a1a1a`（dark）/ `#ffffff`（light）

---

## 7. 代码规范

### 7.1 文件行数预算
- `App.vue`：≤ 420 行（当前 419）
- `useCatalogViewState.ts`：≤ 340 行（当前 308）
- `useLibraryAdminState.ts`：≤ 420 行
- 检查脚本：`scripts/check_file_line_budgets.js`，在 pre-commit 中运行

### 7.2 z-index 治理
- **禁止**在组件中直接使用 `z-50`、`z-[999]` 等魔法值
- 使用 CSS 变量层级：`--z-topbar`、`--z-modal-content`、`--z-float` 等
- 定义位置：`frontend/src/styles/globals.css`

### 7.3 过渡动画规范
- **禁止**使用 `transition-all`
- 必须显式指定过渡属性：`transition-[background-color,border-color,box-shadow,backdrop-filter]`

### 7.4 主题 Token
- 背景色：`bg-background`（禁止 `bg-white` / `bg-black`）
- 卡片背景：`bg-card`
- 文字：`text-foreground`、`text-muted-foreground`
- 边框：`border-border`

### 7.5 Scroll Lock
- 使用 `useScrollLock.ts`（引用计数），禁止直接操作 `document.body.style.overflow`

### 7.6 请求规范
- API 封装：`features/shared/httpClient.ts` 的 `apiFetchJson<T>`
- 路由切换取消：通过 `useRouteAbortController.ts` 传递 `AbortSignal`

### 7.7 无障碍
- 按钮触控目标 ≥ 44×44px
- Dialog/Sheet 关闭按钮使用 `focus-visible:` 而非 `focus:`
- 表单输入必须有关联 `label for`
- 尊重 `prefers-reduced-motion`：GSAP 动画在 `reduce` 模式下跳过，CSS 兜底 `opacity: 1 !important`

---

## 8. 目录结构速查

```
frontend/src/
  components/ui/         # shadcn-vue 组件（Button、Dialog、Sheet 等）
  components/viewer/     # ViewerStageShell（iframe 包装）
  composables/           # useTheme、useScrollLock、useRouteAbortController
  features/
    auth/                # useAuthStore、authApi
    catalog/             # catalogService、useCatalogViewState、favorites、recentActivity
    library/             # libraryApi、libraryApiMappers、libraryApiPayloads
    viewer/              # viewerService、loadViewerModel
    admin/               # adminApi、各 admin composables
  lib/                   # gsap.ts、storage.ts、utils.ts
  router/                # routes.ts、redirect.ts
  views/                 # CatalogView、ViewerView、LoginView、admin/*
  styles/                # globals.css、catalog-themes.css
server/
  middleware/            # securityHeaders.js、errorHandler.js
  routes/                # spaRoutes.js、auth.js、contentRoutes.js
  lib/                   # catalog.js、contentStore.js
```

---

## 9. 关键环境变量

| 变量 | 说明 |
|------|------|
| `TRUST_PROXY` | Express `trust proxy` 配置 |
| `METRICS_PUBLIC` | `/api/metrics` 是否公开 |
| `STATE_DB_MODE` | `sqlite` / `off` |

---

*最后更新：2026-04-18*
